class RoadmapPlatform {
    constructor() {
        this.nodes = {};
        this.draggedNode = null;
        this.currentEditingNode = null;
        this.selectedNode = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadRoadmap();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('addNodeBtn').addEventListener('click', () => this.addRootNode());
        document.getElementById('addBranchBtn').addEventListener('click', () => this.addBranch());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveRoadmap());
        document.getElementById('loadBtn').addEventListener('click', () => this.loadRoadmap());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearRoadmap());

        // Canvas click to deselect
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('click', (e) => {
            if (e.target === canvas || e.target.id === 'nodes-layer') {
                this.deselectAll();
            }
        });

        // Modal events
        const modal = document.getElementById('nodeModal');
        const closeBtn = document.querySelector('.close');
        const cancelBtn = document.getElementById('cancelBtn');
        const deleteBtn = document.getElementById('deleteNodeBtn');
        const addChildBtn = document.getElementById('addChildBtn');
        const nodeForm = document.getElementById('nodeForm');

        closeBtn.addEventListener('click', () => this.closeModal());
        cancelBtn.addEventListener('click', () => this.closeModal());
        deleteBtn.addEventListener('click', () => this.deleteCurrentNode());
        addChildBtn.addEventListener('click', () => this.addChildFromModal());
        nodeForm.addEventListener('submit', (e) => this.saveNodeEdit(e));

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    addRootNode() {
        const colorPicker = document.getElementById('colorPicker');
        const rootNodes = Object.values(this.nodes).filter(n => n.level === 0);
        const lastRoot = rootNodes[rootNodes.length - 1];
        
        const node = {
            id: 'node_' + Date.now(),
            title: 'Root Node',
            description: '',
            color: colorPicker.value,
            position: {
                x: lastRoot ? lastRoot.position.x : 50,
                y: lastRoot ? lastRoot.position.y + 150 : 50
            },
            expanded: true,
            links: [],
            children: [],
            parent: lastRoot ? lastRoot.id : null,
            level: 0
        };

        this.createNodeAPI(node).then(data => {
            if (data.success) {
                this.nodes[node.id] = data.node;
                if (lastRoot) {
                    lastRoot.children = lastRoot.children || [];
                    lastRoot.children.push(node.id);
                    this.nodes[lastRoot.id] = lastRoot;
                    this.updateNodeAPI(lastRoot.id, { children: lastRoot.children });
                }
                this.renderNode(data.node);
                this.updateConnections();
            }
        });
    }

    addBranch() {
        if (!this.selectedNode) {
            alert('Please select a node first by clicking on it.');
            return;
        }
        this.createBranchAPI(this.selectedNode).then(data => {
            if (data.success) {
                this.nodes[data.node.id] = data.node;
                this.nodes[data.parent.id] = data.parent;
                this.renderNode(data.node);
                this.updateConnections();
            }
        });
    }

    addChildFromModal() {
        if (!this.currentEditingNode) return;
        
        this.createBranchAPI(this.currentEditingNode).then(data => {
            if (data.success) {
                this.nodes[data.node.id] = data.node;
                this.nodes[data.parent.id] = data.parent;
                this.renderNode(data.node);
                this.updateConnections();
            }
        });
    }

    renderNode(node) {
        const nodesLayer = document.getElementById('nodes-layer');
        const nodeEl = document.createElement('div');
        
        let nodeClass = 'node';
        if (!node.expanded) nodeClass += ' collapsed';
        if (node.level === 0) nodeClass += ' root';
        else nodeClass += ' branch';
        if (this.selectedNode === node.id) nodeClass += ' selected';
        
        nodeEl.className = nodeClass;
        nodeEl.id = node.id;
        nodeEl.style.left = node.position.x + 'px';
        nodeEl.style.top = node.position.y + 'px';
        nodeEl.style.backgroundColor = node.color;
        nodeEl.draggable = true;

        const linksHtml = node.links && node.links.length > 0 
            ? `<div class="node-links">${node.links.map(link => 
                `<a href="${link}" target="_blank" onclick="event.stopPropagation()" class="link-icon">🔗</a>`
              ).join('')}</div>`
            : '';

        const hasChildren = node.children && node.children.length > 0;
        const showBranchBtn = node.expanded || node.level === 0;

        nodeEl.innerHTML = `
            <div class="node-header">
                <div class="node-title" onclick="roadmap.selectNode('${node.id}')">${node.title}</div>
                <div class="node-controls">
                    ${showBranchBtn ? `<button class="branch-btn" onclick="roadmap.addBranchTo('${node.id}', event)" title="Add Branch">+</button>` : ''}
                    ${hasChildren ? `<button class="expand-btn" onclick="roadmap.toggleExpand('${node.id}', event)" title="${node.expanded ? 'Collapse' : 'Expand'} branches">${node.expanded ? '−' : '+'}</button>` : ''}
                    ${hasChildren ? `<button class="minimize-btn" onclick="roadmap.minimizeAllChildren('${node.id}', event)" title="Minimize all child branches">⊟</button>` : ''}
                </div>
            </div>
            <div class="node-content">
                ${node.description ? `<div class="node-description">${node.description}</div>` : ''}
                ${linksHtml}
            </div>
        `;

        // Click to select
        nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node.id);
        });

        // Double click to edit
        nodeEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.editNode(node.id);
        });

        // Make node draggable
        this.makeDraggable(nodeEl, node.id);

        nodesLayer.appendChild(nodeEl);
    }

    selectNode(nodeId) {
        // Remove previous selection
        if (this.selectedNode) {
            const prevSelected = document.getElementById(this.selectedNode);
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
        }
        
        // Set new selection
        this.selectedNode = nodeId;
        const nodeEl = document.getElementById(nodeId);
        if (nodeEl) {
            nodeEl.classList.add('selected');
        }
        
        // Enable/disable branch button
        const branchBtn = document.getElementById('addBranchBtn');
        branchBtn.disabled = false;
    }

    addBranchTo(nodeId, event) {
        event.stopPropagation();
        this.createBranchAPI(nodeId).then(data => {
            if (data.success) {
                this.nodes[data.node.id] = data.node;
                this.nodes[data.parent.id] = data.parent;
                this.renderNode(data.node);
                this.updateConnections();
            }
        });
    }

    toggleExpand(nodeId, event) {
        event.stopPropagation();
        const node = this.nodes[nodeId];
        node.expanded = !node.expanded;

        this.updateNodeAPI(nodeId, { expanded: node.expanded }).then(() => {
            this.refreshDisplay();
        });
    }

    editNode(nodeId) {
        this.currentEditingNode = nodeId;
        const node = this.nodes[nodeId];
        
        document.getElementById('nodeTitle').value = node.title;
        document.getElementById('nodeDescription').value = node.description;
        document.getElementById('nodeLinks').value = node.links ? node.links.join('\n') : '';
        document.getElementById('nodeColor').value = node.color;
        
        document.getElementById('nodeModal').style.display = 'block';
    }

    saveNodeEdit(event) {
        event.preventDefault();
        
        if (!this.currentEditingNode) return;

        const formData = new FormData(event.target);
        const links = formData.get('links').split('\n').filter(link => link.trim());
        
        const updatedNode = {
            title: formData.get('title'),
            description: formData.get('description'),
            color: formData.get('color'),
            links: links
        };

        this.updateNodeAPI(this.currentEditingNode, updatedNode).then(data => {
            if (data.success) {
                this.nodes[this.currentEditingNode] = data.node;
                document.getElementById(this.currentEditingNode).remove();
                this.renderNode(data.node);
                this.closeModal();
            }
        });
    }

    deleteCurrentNode() {
        if (!this.currentEditingNode) return;

        if (confirm('Are you sure you want to delete this node?')) {
            this.deleteNodeAPI(this.currentEditingNode).then(data => {
                if (data.success) {
                    document.getElementById(this.currentEditingNode).remove();
                    delete this.nodes[this.currentEditingNode];
                    this.closeModal();
                }
            });
        }
    }

    closeModal() {
        document.getElementById('nodeModal').style.display = 'none';
        this.currentEditingNode = null;
    }

    makeDraggable(element, nodeId) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        element.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            const canvas = document.getElementById('canvas');
            const canvasRect = canvas.getBoundingClientRect();
            
            initialX = rect.left - canvasRect.left + canvas.scrollLeft;
            initialY = rect.top - canvasRect.top + canvas.scrollTop;
            
            element.style.cursor = 'grabbing';
            element.style.zIndex = '1000';
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            element.style.left = newX + 'px';
            element.style.top = newY + 'px';
            
            // Update node position in memory
            this.nodes[nodeId].position = { x: newX, y: newY };
            
            // Update connections in real-time
            this.updateConnections();
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            element.style.cursor = 'move';
            element.style.zIndex = 'auto';
            
            // Save position to server
            const node = this.nodes[nodeId];
            this.updateNodeAPI(nodeId, { position: node.position });
        });
    }

    deselectAll() {
        if (this.selectedNode) {
            const prevSelected = document.getElementById(this.selectedNode);
            if (prevSelected) {
                prevSelected.classList.remove('selected');
            }
            this.selectedNode = null;
            
            // Disable branch button
            const branchBtn = document.getElementById('addBranchBtn');
            branchBtn.disabled = true;
        }
    }

    saveRoadmap() {
        const dataStr = JSON.stringify(this.nodes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'roadmap.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    loadRoadmap() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        this.nodes = JSON.parse(e.target.result);
                        this.refreshDisplay();
                    } catch (error) {
                        alert('Invalid JSON file');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    clearRoadmap() {
        if (confirm('Are you sure you want to clear all nodes?')) {
            this.clearCanvas();
            this.nodes = {};
        }
    }

    clearCanvas() {
        document.getElementById('nodes-layer').innerHTML = '';
        document.getElementById('connections').innerHTML = '';
    }

    refreshDisplay() {
        this.clearCanvas();
        Object.values(this.nodes).forEach(node => {
            if (this.isNodeVisible(node)) {
                this.renderNode(node);
            }
        });
        this.updateConnections();
    }

    isNodeVisible(node) {
        // Check if node should be visible based on parent expansion state
        if (!node.parent) return true; // Root nodes are always visible
        
        const parent = this.nodes[node.parent];
        if (!parent) return true;
        
        // If parent is collapsed, this node should not be visible
        if (!parent.expanded) return false;
        
        // Recursively check parent visibility
        return this.isNodeVisible(parent);
    }

    minimizeAllChildren(nodeId, event) {
        event.stopPropagation();
        
        const node = this.nodes[nodeId];
        if (!node.children || node.children.length === 0) return;
        
        // First collapse the parent node to hide all children
        node.expanded = false;
        this.updateNodeAPI(nodeId, { expanded: false });
        
        // Then recursively minimize all children and their descendants
        const minimizeRecursive = (currentNodeId) => {
            const currentNode = this.nodes[currentNodeId];
            if (!currentNode) return;
            
            // Collapse this node
            currentNode.expanded = false;
            
            // Update on server
            this.updateNodeAPI(currentNodeId, { expanded: false });
            
            // Recursively minimize children
            if (currentNode.children && currentNode.children.length > 0) {
                currentNode.children.forEach(childId => {
                    minimizeRecursive(childId);
                });
            }
        };
        
        // Minimize all direct children
        node.children.forEach(childId => {
            minimizeRecursive(childId);
        });
        
        // Refresh the display immediately
        this.refreshDisplay();
    }

    updateConnections() {
        const svg = document.getElementById('connections');
        svg.innerHTML = '';
        
        // Set SVG dimensions to match canvas
        const canvas = document.getElementById('canvas');
        svg.setAttribute('width', canvas.scrollWidth);
        svg.setAttribute('height', canvas.scrollHeight);
        
        Object.values(this.nodes).forEach(node => {
            if (node.children && node.children.length > 0 && node.expanded && this.isNodeVisible(node)) {
                node.children.forEach(childId => {
                    const childNode = this.nodes[childId];
                    if (childNode && this.isNodeVisible(childNode)) {
                        this.drawConnection(node, childNode);
                    }
                });
            }
        });
    }

    drawConnection(parentNode, childNode) {
        const svg = document.getElementById('connections');
        
        // Calculate connection points
        let parentX, parentY, childX, childY, path;
        
        if (parentNode.level === 0 && childNode.level === 0) {
            // Vertical connection for root nodes
            parentX = parentNode.position.x + 100; // Center bottom of parent
            parentY = parentNode.position.y + 80;  // Bottom of parent
            childX = childNode.position.x + 100;   // Center top of child
            childY = childNode.position.y;         // Top of child
            path = `M ${parentX} ${parentY} L ${childX} ${childY}`;
        } else {
            // Horizontal connection for branches
            parentX = parentNode.position.x + 200; // Right edge of parent
            parentY = parentNode.position.y + 50;  // Middle of parent
            childX = childNode.position.x;         // Left edge of child
            childY = childNode.position.y + 50;   // Middle of child
            const midX = parentX + (childX - parentX) / 2;
            path = `M ${parentX} ${parentY} C ${midX} ${parentY}, ${midX} ${childY}, ${childX} ${childY}`;
        }
        
        // Create path element
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', path);
        const lineClass = parentNode.level === 0 && childNode.level === 0 ? 'connection-line root-connection' : 'connection-line';
        pathElement.setAttribute('class', lineClass);
        pathElement.setAttribute('data-parent', parentNode.id);
        pathElement.setAttribute('data-child', childNode.id);
        
        // Create arrowhead
        const arrowSize = 8;
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        let arrowPoints;
        
        if (parentNode.level === 0 && childNode.level === 0) {
            // Downward arrow for vertical connections
            arrowPoints = `${childX},${childY} ${childX-arrowSize/2},${childY-arrowSize} ${childX+arrowSize/2},${childY-arrowSize}`;
        } else {
            // Rightward arrow for horizontal connections
            arrowPoints = `${childX},${childY} ${childX-arrowSize},${childY-arrowSize/2} ${childX-arrowSize},${childY+arrowSize/2}`;
        }
        
        arrow.setAttribute('points', arrowPoints);
        arrow.setAttribute('class', 'connection-arrow');
        
        svg.appendChild(pathElement);
        svg.appendChild(arrow);
    }



    // API Methods
    async createNodeAPI(node) {
        const response = await fetch('/api/roadmap/node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(node)
        });
        return response.json();
    }

    async updateNodeAPI(nodeId, data) {
        const response = await fetch(`/api/roadmap/node/${nodeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }

    async deleteNodeAPI(nodeId) {
        const response = await fetch(`/api/roadmap/node/${nodeId}`, {
            method: 'DELETE'
        });
        return response.json();
    }

    async createBranchAPI(parentId) {
        const colorPicker = document.getElementById('colorPicker');
        const branchData = {
            title: 'New Branch',
            description: '',
            color: colorPicker.value
        };
        
        const response = await fetch(`/api/roadmap/node/${parentId}/branch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branchData)
        });
        return response.json();
    }
}

// Initialize the roadmap platform
const roadmap = new RoadmapPlatform();