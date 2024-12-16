import { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import hierarchyData from './data/mapping.json';
import mergedData from './data/merged_data.json';

// Node Component for recursive rendering
const Node = ({ node, expanded, setExpanded, selectedColumns, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.key];
  const checkboxRef = useRef();

  const [showTooltip, setShowTooltip] = useState(false);

  const getNodeState = (node) => {
    const nodeVariables = node.variables || [];
    const allVariablesSelected = nodeVariables.every(variable => selectedColumns.includes(variable));
    const someVariablesSelected = nodeVariables.some(variable => selectedColumns.includes(variable));

    const childrenStates = (node.children || []).map(getNodeState);
    const allChildrenSelected = childrenStates.every(state => state === 'selected');
    const someChildrenSelected = childrenStates.some(state => state === 'selected' || state === 'indeterminate');

    if (allVariablesSelected && allChildrenSelected) {
      return 'selected';
    } else if (someVariablesSelected || someChildrenSelected) {
      return 'indeterminate';
    }
    return 'unselected';
  };

  const nodeState = getNodeState(node);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = nodeState === 'indeterminate';
    }
  }, [nodeState]);

  const toggleExpand = (node, children = false) => {
    setExpanded((prev) => ({
      ...prev,
      [node.key]: children || !prev[node.key], // if children is true, expand all children
    }));

    if (children && node.children) {
      node.children.forEach(child => {
        toggleExpand(child, children);
      });
    }
  };

  const toggleNodeVariables = (node) => {
    const getAllVariables = (node) => {
      let variables = node.variables || [];
      if (node.children) {
        node.children.forEach((child) => {
          variables = variables.concat(getAllVariables(child));
        });
      }
      return variables;
    };

    const allVariables = getAllVariables(node);
    const selected = nodeState !== 'selected';
    onToggle(allVariables, selected);

    if (selected && !isExpanded) {
      toggleExpand(node, true);
    }
  };

  const renderCheckbox = () => (
    <>
      <input
        type="checkbox"
        ref={checkboxRef}
        checked={nodeState === 'selected'}
        onChange={() => toggleNodeVariables(node)}
        className="mr-2 ml-1"
      />
      {showTooltip && renderTooltip()}
    </>
  );

  const renderTooltip = () => (
    <div
      className="absolute bg-white text-sm border p-2 rounded shadow-lg z-10"
      style={{ top: checkboxRef.current.offsetTop + 20, left: checkboxRef.current.offsetLeft + 50 }}
    >
      <table className="w-full">
        <thead>
          <tr>
            <th className="p-1 border">ID</th>
            <th className="p-1 border">Label</th>
            <th className="p-1 border">Definition</th>
          </tr>
        </thead>
        <tbody>
          {node.classes.map((cls) => (
            <tr key={cls.id} className="border">
              <td className="p-2 border font-semibold">{cls.id}</td>
              <td className="p-2 border">{cls.label}</td>
              <td className="p-2 border">{cls.definition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div key={node.key} className="pl-2 mt-3">
      {hasChildren ? (
        <div
          className="flex items-center cursor-pointer hover:bg-gray-100"
          onMouseEnter={() => node.classes.length && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {isExpanded ? (
            <ChevronDown onClick={() => toggleExpand(node)} size={16} />
          ) : (
            <ChevronRight onClick={() => toggleExpand(node)} size={16} />
          )}
          {renderCheckbox()}
          <span className={`font-semibold ${nodeState === 'selected' ? 'text-blue-600' : ''}`}>
            {node.label}
          </span>
        </div>
      ) : (
        <div
          className="flex items-center"
          onMouseEnter={() => node.classes.length && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {renderCheckbox()}
          <span>{node.label}</span>
        </div>
      )}
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {node.children.map((child) => (
            <Node
              key={child.key}
              node={child}
              expanded={expanded}
              setExpanded={setExpanded}
              selectedColumns={selectedColumns}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CheckboxTree = ({ data, selectedColumns, onToggle }) => {
  const [expanded, setExpanded] = useState({});

  return (
    <div className="bg-white border rounded p-2">
      {data.map((node) => (
        <Node
          key={node.key}
          node={node}
          expanded={expanded}
          setExpanded={setExpanded}
          selectedColumns={selectedColumns}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
};

const CSVDataViewer = ({ data, selectedColumns }) => {
  if (!data || data.length === 0 || selectedColumns.length === 0) {
    return <div>Select columns to view data</div>;
  }

  const columnsToRender = ['LSR #', 'Study name', ...selectedColumns];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            {columnsToRender.map((column) => (
              <th key={column} className="border p-2 bg-gray-100">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data
            .filter((row) => selectedColumns.some((column) => row[column] !== null))
            .map((row, index) => (
              <tr key={index} className="border-b">
                {columnsToRender.map((column) => (
                  <td
                    key={`${index}-${column}`}
                    className={`border p-2 ${row[column] === null ? 'no-data' : ''}`}
                  >
                    {row[column]}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

const HierarchicalDataViewer = () => {
  const [selectedColumns, setSelectedColumns] = useState([]);

  const toggleColumns = (columns, select = true) => {
    setSelectedColumns((prev) => {
      const newSelection = select
        ? [
            ...new Set([
              ...prev.map((col) => JSON.stringify(col)),
              ...columns.map((col) => JSON.stringify(col)),
            ]),
          ].map((col) => JSON.parse(col)) // Convert the strings back to original objects/arrays
        : prev.filter((col) => !columns.some((c) => JSON.stringify(c) === JSON.stringify(col)));
      return newSelection;
    });
  };

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
        <CSVDataViewer data={mergedData} selectedColumns={selectedColumns} />
      </div>
    </div>
  );
};

export default HierarchicalDataViewer;
