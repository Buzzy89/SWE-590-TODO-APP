# Architecture Diagrams

Bu dizin, **Diagrams** Python kütüphanesi kullanılarak oluşturulmuş profesyonel architecture diagramlarını içerir.

## 📊 Generated Diagrams

1. **Main Architecture Diagram** (`todo_app_architecture.png`)
   - Complete cloud architecture overview
   - GCP services and their relationships
   - Kubernetes components and service mesh
   - External access points

2. **Performance Optimization Diagram** (`performance_optimizations.png`)
   - Auth service optimization layers
   - Performance improvement metrics
   - Before/after comparison

3. **Cost Breakdown Diagram** (`cost_breakdown.png`)
   - Monthly cost analysis
   - Service cost distribution
   - Budget compliance visualization

## 🚀 How to Generate Diagrams

### Prerequisites
```bash
# Install Graphviz (required by Diagrams library)
# macOS
brew install graphviz

# Ubuntu/Debian
sudo apt-get install graphviz

# Windows (using Chocolatey)
choco install graphviz
```

### Install Python Dependencies
```bash
cd architecture
pip install -r requirements.txt
```

### Generate Diagrams
```bash
python generate_diagram.py
```

## 📁 Output Files

The script generates three PNG files:
- `todo_app_architecture.png` - Main architecture diagram
- `performance_optimizations.png` - Performance optimization layers
- `cost_breakdown.png` - Cost analysis breakdown

## 🎨 Customization

To modify the diagrams:
1. Edit `generate_diagram.py`
2. Adjust clusters, components, or connections
3. Run the script to regenerate diagrams

## 📚 Diagrams Library Reference

- **Official Documentation**: https://diagrams.mingrammer.com/
- **Icons**: https://diagrams.mingrammer.com/docs/nodes/
- **Examples**: https://github.com/mingrammer/diagrams/tree/master/examples

## 🔧 Troubleshooting

If you encounter issues:
1. Ensure Graphviz is properly installed
2. Check Python dependencies: `pip list | grep diagrams`
3. Verify write permissions in the architecture directory
4. On macOS: `brew reinstall graphviz` if needed 