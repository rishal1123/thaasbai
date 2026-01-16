"""
Dhiha Ei - Multiplayer Game Server
Python WebSocket server using Flask-SocketIO
"""

import os
import random
import string
import time
from flask import Flask, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# In-memory storage for rooms and players
rooms = {}
player_sessions = {}  # Maps session ID to room and position

def generate_room_code():
    """Generate a 6-character room code"""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    while True:
        code = ''.join(random.choice(chars) for _ in range(6))
        if code not in rooms:
            return code

def get_room_state(room_id):
    """Get serializable room state"""
    if room_id not in rooms:
        return None
    room = rooms[room_id]
    return {
        'roomId': room_id,
        'metadata': room['metadata'],
        'players': room['players'],
        'gameState': room.get('gameState'),
        'hands': room.get('hands')
    }

# Serve static files
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# WebSocket Events

@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')
    emit('connected', {'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    print(f'Client disconnected: {sid}')

    # Clean up player from room
    if sid in player_sessions:
        session = player_sessions[sid]
        room_id = session['roomId']
        position = session['position']

        if room_id in rooms:
            room = rooms[room_id]

            # Mark player as disconnected or remove
            if position in room['players']:
                if room['metadata']['status'] == 'playing':
                    # During game, mark as disconnected
                    room['players'][position]['connected'] = False
                    emit('player_disconnected', {
                        'position': position,
                        'players': room['players']
                    }, room=room_id)
                else:
                    # In lobby, remove player
                    del room['players'][position]
                    room['metadata']['playerCount'] = len(room['players'])

                    # Delete room if empty
                    if len(room['players']) == 0:
                        del rooms[room_id]
                        print(f'Room {room_id} deleted (empty)')
                    else:
                        emit('players_changed', {'players': room['players']}, room=room_id)

        del player_sessions[sid]

@socketio.on('create_room')
def handle_create_room(data):
    sid = request.sid
    player_name = data.get('playerName', 'Player')

    room_id = generate_room_code()

    rooms[room_id] = {
        'metadata': {
            'host': sid,
            'created': time.time(),
            'status': 'waiting',
            'playerCount': 1
        },
        'players': {
            0: {
                'oderId': sid,
                'name': player_name,
                'ready': False,
                'connected': True
            }
        },
        'gameState': None,
        'hands': None
    }

    player_sessions[sid] = {
        'roomId': room_id,
        'position': 0
    }

    join_room(room_id)

    print(f'Room {room_id} created by {player_name}')

    emit('room_created', {
        'roomId': room_id,
        'position': 0,
        'players': rooms[room_id]['players']
    })

@socketio.on('join_room')
def handle_join_room(data):
    sid = request.sid
    room_id = data.get('roomId', '').upper().strip()
    player_name = data.get('playerName', 'Player')

    if room_id not in rooms:
        emit('error', {'message': 'Room not found'})
        return

    room = rooms[room_id]

    if room['metadata']['status'] != 'waiting':
        emit('error', {'message': 'Game already in progress'})
        return

    # Find empty slot
    position = None
    for i in range(4):
        if i not in room['players']:
            position = i
            break

    if position is None:
        emit('error', {'message': 'Room is full'})
        return

    # Add player
    room['players'][position] = {
        'oderId': sid,
        'name': player_name,
        'ready': False,
        'connected': True
    }
    room['metadata']['playerCount'] = len(room['players'])

    player_sessions[sid] = {
        'roomId': room_id,
        'position': position
    }

    join_room(room_id)

    print(f'{player_name} joined room {room_id} at position {position}')

    # Notify the joining player
    emit('room_joined', {
        'roomId': room_id,
        'position': position,
        'players': room['players']
    })

    # Notify others in room
    emit('players_changed', {'players': room['players']}, room=room_id, include_self=False)

@socketio.on('leave_room')
def handle_leave_room():
    sid = request.sid

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']
    position = session['position']

    if room_id in rooms:
        room = rooms[room_id]

        if position in room['players']:
            del room['players'][position]
            room['metadata']['playerCount'] = len(room['players'])

        leave_room(room_id)

        # Delete room if empty
        if len(room['players']) == 0:
            del rooms[room_id]
            print(f'Room {room_id} deleted (empty)')
        else:
            emit('players_changed', {'players': room['players']}, room=room_id)

    del player_sessions[sid]
    emit('left_room', {})

@socketio.on('set_ready')
def handle_set_ready(data):
    sid = request.sid
    ready = data.get('ready', False)

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']
    position = session['position']

    if room_id in rooms and position in rooms[room_id]['players']:
        rooms[room_id]['players'][position]['ready'] = ready
        emit('players_changed', {'players': rooms[room_id]['players']}, room=room_id)

@socketio.on('swap_player')
def handle_swap_player(data):
    sid = request.sid
    from_position = data.get('fromPosition')

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']

    # Only host (position 0) can swap
    if session['position'] != 0:
        emit('error', {'message': 'Only host can assign teams'})
        return

    if room_id not in rooms:
        return

    room = rooms[room_id]
    players = room['players']

    if from_position not in players:
        emit('error', {'message': 'No player in that position'})
        return

    # Determine teams
    # Team A: positions 0, 2 | Team B: positions 1, 3
    current_team = 0 if from_position in [0, 2] else 1
    target_team = 1 if current_team == 0 else 0
    target_positions = [1, 3] if target_team == 1 else [0, 2]

    # Find empty slot on target team
    target_position = None
    for pos in target_positions:
        if pos not in players:
            target_position = pos
            break

    player_to_move = players[from_position]

    if target_position is not None:
        # Move to empty slot
        players[target_position] = player_to_move
        del players[from_position]

        # Update session for moved player
        for sess_id, sess in player_sessions.items():
            if sess['roomId'] == room_id and sess['position'] == from_position:
                sess['position'] = target_position
                break
    else:
        # Swap with first player on target team
        target_position = target_positions[0]
        player_to_swap = players[target_position]

        players[target_position] = player_to_move
        players[from_position] = player_to_swap

        # Update sessions for both players
        for sess_id, sess in player_sessions.items():
            if sess['roomId'] == room_id:
                if sess['position'] == from_position:
                    sess['position'] = target_position
                elif sess['position'] == target_position:
                    sess['position'] = from_position

    emit('players_changed', {'players': players}, room=room_id)

    # Notify affected players of their new positions
    emit('position_changed', {
        'fromPosition': from_position,
        'toPosition': target_position,
        'players': players
    }, room=room_id)

@socketio.on('start_game')
def handle_start_game(data):
    sid = request.sid

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']

    # Only host can start
    if session['position'] != 0:
        emit('error', {'message': 'Only host can start the game'})
        return

    if room_id not in rooms:
        return

    room = rooms[room_id]

    # Verify 4 players and all ready
    if len(room['players']) != 4:
        emit('error', {'message': 'Need 4 players to start'})
        return

    all_ready = all(p.get('ready', False) for p in room['players'].values())
    if not all_ready:
        emit('error', {'message': 'All players must be ready'})
        return

    # Set game state
    room['metadata']['status'] = 'playing'
    room['gameState'] = data.get('gameState', {})
    room['hands'] = data.get('hands', {})

    print(f'Game started in room {room_id}')

    emit('game_started', {
        'gameState': room['gameState'],
        'hands': room['hands'],
        'players': room['players']
    }, room=room_id)

@socketio.on('card_played')
def handle_card_played(data):
    sid = request.sid

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']
    position = session['position']

    card = data.get('card')

    print(f'Card played in room {room_id}: {card} by position {position}')

    # Broadcast to all other players in room
    emit('remote_card_played', {
        'card': card,
        'position': position
    }, room=room_id, include_self=False)

@socketio.on('update_game_state')
def handle_update_game_state(data):
    sid = request.sid

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']

    if room_id in rooms:
        rooms[room_id]['gameState'] = data.get('gameState', {})

        emit('game_state_updated', {
            'gameState': rooms[room_id]['gameState']
        }, room=room_id, include_self=False)

@socketio.on('new_round')
def handle_new_round(data):
    sid = request.sid

    if sid not in player_sessions:
        return

    session = player_sessions[sid]
    room_id = session['roomId']

    # Only host broadcasts new rounds
    if session['position'] != 0:
        return

    if room_id in rooms:
        rooms[room_id]['gameState'] = data.get('gameState', {})
        rooms[room_id]['hands'] = data.get('hands', {})

        print(f'New round started in room {room_id}')

        emit('round_started', {
            'gameState': rooms[room_id]['gameState'],
            'hands': rooms[room_id]['hands']
        }, room=room_id)

# Need to import request for sid access
from flask import request

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f'Starting Dhiha Ei server on port {port}...')
    socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
