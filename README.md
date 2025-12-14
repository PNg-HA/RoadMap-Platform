# Roadmap Platform

Interactive web-based roadmap creation tool with hierarchical node structure and visual connections.

## Features

### Node Management
- **Root Nodes**: Create main roadmap items arranged vertically
- **Branch Nodes**: Add child branches to any node with horizontal layout
- **Drag & Drop**: Move nodes anywhere on the canvas
- **Color Customization**: Set different background colors for nodes
- **Link Attachments**: Add clickable URLs to nodes

### Visual Connections
- **Automatic Lines**: SVG connections between parent and child nodes
- **Root Connections**: Thick vertical lines connecting sequential root nodes
- **Branch Connections**: Curved horizontal lines for parent-child relationships

### Interactive Controls
- **Expand/Collapse**: Toggle visibility of child branches (+ / - buttons)
- **Minimize All**: Collapse entire branch hierarchies (⊟ button)
- **Node Selection**: Click to select nodes for branching
- **Edit Mode**: Double-click nodes to edit title, description, and links

### Data Management
- **Save**: Export roadmap as JSON file
- **Load**: Import previously saved JSON files
- **Clear**: Remove all nodes from canvas

## How to Use

1. **Create Root Node**: Click "Add Root Node" to start your roadmap
2. **Add Branches**: Select a node and click "Add Branch" or use the + button
3. **Edit Nodes**: Double-click any node to modify its properties
4. **Move Nodes**: Drag nodes to reposition them on the canvas
5. **Manage Hierarchy**: Use expand/collapse buttons to organize view
6. **Save Work**: Use Save button to download your roadmap as JSON
7. **Load Work**: Use Load button to import saved roadmap files

## Deployment

### Requirements
- Python 3.11+
- Flask 2.3.3+
- Modern web browser with JavaScript enabled

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run the application
python app.py

# Access via EC2 public IP:5000
```
