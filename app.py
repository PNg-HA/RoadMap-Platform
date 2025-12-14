from flask import Flask, render_template, request, jsonify
import json
import uuid
import os

app = Flask(__name__)

# In-memory storage for roadmap data
roadmap_data = {
    'nodes': {},
    'connections': {},
    'branches': {}  # Store parent-child relationships
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/roadmap', methods=['GET'])
def get_roadmap():
    return jsonify(roadmap_data)

@app.route('/api/roadmap/node', methods=['POST'])
def create_node():
    data = request.json
    node_id = data.get('id', str(uuid.uuid4()))
    roadmap_data['nodes'][node_id] = {
        'id': node_id,
        'title': data.get('title', 'New Node'),
        'description': data.get('description', ''),
        'color': data.get('color', '#3498db'),
        'links': data.get('links', []),
        'position': data.get('position', {'x': 100, 'y': 100}),
        'expanded': data.get('expanded', True),
        'children': data.get('children', []),
        'parent': data.get('parent', None),
        'level': data.get('level', 0)
    }
    return jsonify({'success': True, 'node': roadmap_data['nodes'][node_id]})

@app.route('/api/roadmap/node/<node_id>', methods=['PUT'])
def update_node(node_id):
    if node_id not in roadmap_data['nodes']:
        return jsonify({'error': 'Node not found'}), 404
    
    data = request.json
    node = roadmap_data['nodes'][node_id]
    
    for key in ['title', 'description', 'color', 'links', 'position', 'expanded', 'children', 'parent', 'level']:
        if key in data:
            node[key] = data[key]
    
    return jsonify({'success': True, 'node': node})

@app.route('/api/roadmap/node/<node_id>', methods=['DELETE'])
def delete_node(node_id):
    if node_id in roadmap_data['nodes']:
        # Remove from parent's children list
        node = roadmap_data['nodes'][node_id]
        if node.get('parent'):
            parent = roadmap_data['nodes'].get(node['parent'])
            if parent and node_id in parent.get('children', []):
                parent['children'].remove(node_id)
        
        # Delete all children recursively
        def delete_children(node_id):
            node = roadmap_data['nodes'].get(node_id)
            if node:
                for child_id in node.get('children', []):
                    delete_children(child_id)
                del roadmap_data['nodes'][node_id]
        
        delete_children(node_id)
        return jsonify({'success': True})
    return jsonify({'error': 'Node not found'}), 404

@app.route('/api/roadmap/node/<parent_id>/branch', methods=['POST'])
def create_branch(parent_id):
    if parent_id not in roadmap_data['nodes']:
        return jsonify({'error': 'Parent node not found'}), 404
    
    data = request.json
    child_id = data.get('id', str(uuid.uuid4()))
    parent_node = roadmap_data['nodes'][parent_id]
    
    # Calculate position for new branch
    parent_pos = parent_node['position']
    children_count = len(parent_node.get('children', []))
    
    child_node = {
        'id': child_id,
        'title': data.get('title', 'New Branch'),
        'description': data.get('description', ''),
        'color': data.get('color', parent_node['color']),
        'links': data.get('links', []),
        'position': {
            'x': parent_pos['x'] + 250,
            'y': parent_pos['y'] + (children_count * 120) - (len(parent_node.get('children', [])) * 60)
        },
        'expanded': True,
        'children': [],
        'parent': parent_id,
        'level': parent_node.get('level', 0) + 1
    }
    
    # Add child to parent's children list
    if 'children' not in parent_node:
        parent_node['children'] = []
    parent_node['children'].append(child_id)
    
    # Store the child node
    roadmap_data['nodes'][child_id] = child_node
    
    return jsonify({'success': True, 'node': child_node, 'parent': parent_node})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)