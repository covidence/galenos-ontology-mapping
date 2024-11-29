import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import hierarchyData from './data/mapping.json';
import Papa from 'papaparse';

// Recursive Checkbox Tree Component
const CheckboxTree = ({ data, selectedColumns, onToggle }) => {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (node, children = false) => {
    setExpanded(prev => ({
      ...prev,
      [node.key]: !prev[node.key]
    }));

    if (children && node.children) {
      node.children.forEach(child => {
        toggleExpand(child, children);
      });
    }
  };

  // Check if any variables in this node or its children are selected
  const isNodeSelected = (node) => {
    const childrenSelected = node.children.length && node.children.every(child => isNodeSelected(child));

    if (!node.variables.length && childrenSelected) {
      return true;
    } else if (node.variables.length) {
      return node.variables.every(variable => selectedColumns.some(col => col[0] === variable[0]));
    }

    return false;
  };

  // Get all variables for a node and its children
  const getAllVariables = (node) => {
    let variables = node.variables || [];

    if (node.children) {
      node.children.forEach(child => {
        variables = variables.concat(getAllVariables(child));
      });
    }

    return variables;
  };

  // Toggle all variables in a node
  const toggleNodeVariables = (node) => {
    const allVariables = getAllVariables(node);

    // This checks the current selection state and calls the onToggle callback
    const selected = !isNodeSelected(node)
    onToggle(allVariables, selected);

    if (selected && !expanded[node.key]) {
      toggleExpand(node, true);
    }
  };

  const renderNode = (node) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.key];
    const nodeSelected = isNodeSelected(node);

    return (
      <div key={node.key} className="pl-2 mt-3">
        {hasChildren ? (
          <div
            className="flex items-center cursor-pointer hover:bg-gray-100"
          >
            {isExpanded ? <ChevronDown onClick={() => toggleExpand(node)} size={16} /> : <ChevronRight onClick={() => toggleExpand(node)} size={16} />}
            <input
              type="checkbox"
              checked={nodeSelected}
              onChange={() => toggleNodeVariables(node)}
              className="mr-2 ml-1"
            />
            <span className={`font-semibold ${nodeSelected ? 'text-blue-600' : ''}`}>
              {node.label}
            </span>
          </div>
        ) : (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={nodeSelected}
              onChange={() => node.variables && toggleNodeVariables(node)}
              className="mr-2 ml-1"
            />
            <span>{node.label}</span>
          </div>
        )}

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border rounded p-2">
      {data.map(node => renderNode(node))}
    </div>
  );
};

// CSV Data Viewer Component
const CSVDataViewer = ({ data, selectedColumns }) => {
  if (!data || data.length === 0 || selectedColumns.length === 0) {
    return <div>Select columns to view data</div>;
  }

  selectedColumns = [['LSR', 'LSR #'], ['study_name', 'Study name'], ...selectedColumns];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            {selectedColumns.map(column => (
              <th key={column[0]} className="border p-2 bg-gray-100">
                {column[1]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (fsdfsd
            <tr key={index} className="border-b">
              {selectedColumns.map(column => (
                <td
                  key={`${index}-${column[0]}`}
                  className={`border p-2 ${row[column[0]] === undefined || row[column[0]] === '' ? 'no-data' : ''}`}
                >
                  {row[column[0]] !== undefined ? row[column[0]] : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Application Component
const HierarchicalDataViewer = () => {
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [csvData, setCsvData] = useState([]);

  const toggleColumns = (columns, select = true) => {
    setSelectedColumns(prev => {
      const newSelection = select
        ? [
            ...new Set([
              ...prev.map(col => JSON.stringify(col)),
              ...columns.map(col => JSON.stringify(col)),
            ]),
          ].map(col => JSON.parse(col)) // Convert the strings back to original objects/arrays
        : prev.filter(col => !columns.some(c => JSON.stringify(c) === JSON.stringify(col)));
      return newSelection;
    });
  };

  useEffect(() => {
    fetch('/combined_extracted_data.csv') // If the CSV is in the public folder
      .then((response) => response.text())
      .then((csvText) => {
        Papa.parse(csvText, {
          complete: (result) => {
            setCsvData(result.data);
          },
          header: true,
          skipEmptyLines: true,
        });
      });
  }, []);

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 overflow-y-auto border-r">
        <h2 className="text-xl font-bold mb-4">Column Selection</h2>
        <CheckboxTree
          data={hierarchyData}
          selectedColumns={selectedColumns}
          onToggle={toggleColumns}
        />
      </div>
      <div className="w-2/3 p-4">
        <h2 className="text-xl font-bold mb-4">Data Table</h2>
        <CSVDataViewer
          data={csvData}
          selectedColumns={selectedColumns}
        />
      </div>
    </div>
  );
};

export default HierarchicalDataViewer;
