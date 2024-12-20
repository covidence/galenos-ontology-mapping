import { forwardRef, useState, useRef, useEffect } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import hierarchyData from "./data/mapping.json";
import mergedData from "./data/merged_data.json";
import ontologyDictionary from "./data/dictionary.json";

const MISSING_VALUES = ["", "NA", null, undefined];

const TooltipTable = forwardRef(({ classes, position, visible }, ref) => {
  return (
    <div
      ref={ref}
      className="absolute bg-white text-sm border p-2 rounded shadow-lg z-10 max-w-xl"
      style={{
        top: position.top,
        left: position.left,
        visibility: visible ? "visible" : "hidden",
      }}
    >
      <p className="text-gray-600 mb-2">
        The following ontology classes are associated with this term:
      </p>
      <table className="w-full">
        <thead>
          <tr>
            <th className="p-1 border">ID</th>
            <th className="p-1 border">Label</th>
            <th className="p-1 border">Definition</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={`tooltip-${cls.id}`} className="border">
              <td className="p-2 border font-semibold">{cls.id}</td>
              <td className="p-2 border">{cls.label}</td>
              <td className="p-2 border">{cls.definition}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Node Component for recursive rendering
const Node = ({ node, expanded, setExpanded, selectedColumns, onToggle }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded[node.key];
  const checkboxRef = useRef();

  const [showTooltip, setShowTooltip] = useState(false);

  const getNodeState = (node) => {
    const nodeVariables = node.variables || [];
    const allVariablesSelected = nodeVariables.every((variable) =>
      selectedColumns.includes(variable)
    );
    const someVariablesSelected = nodeVariables.some((variable) =>
      selectedColumns.includes(variable)
    );

    const childrenStates = (node.children || []).map(getNodeState);
    const allChildrenSelected = childrenStates.every(
      (state) => state === "selected"
    );
    const someChildrenSelected = childrenStates.some(
      (state) => state === "selected" || state === "indeterminate"
    );

    if (allVariablesSelected && allChildrenSelected) {
      return "selected";
    } else if (someVariablesSelected || someChildrenSelected) {
      return "indeterminate";
    }
    return "unselected";
  };

  const nodeState = getNodeState(node);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = nodeState === "indeterminate";
    }
  }, [nodeState]);

  const toggleExpand = (node, children = false) => {
    setExpanded((prev) => ({
      ...prev,
      [node.key]: children || !prev[node.key], // if children is true, expand all children
    }));

    if (children && node.children) {
      node.children.forEach((child) => {
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
    const selected = nodeState !== "selected";
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
        checked={nodeState === "selected"}
        onChange={() => toggleNodeVariables(node)}
        className="mr-2 ml-1"
      />
      {showTooltip && (
        <TooltipTable
          classes={node.classes}
          position={{
            top: checkboxRef.current?.offsetTop + 20,
            left: checkboxRef.current?.offsetLeft + 50,
          }}
          visible={showTooltip}
        />
      )}
    </>
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
          <span
            className={`font-semibold ${
              nodeState === "selected" ? "text-blue-600" : ""
            }`}
          >
            {node.label}
          </span>
        </div>
      ) : (
        <div
          className="flex items-center hover:bg-gray-100"
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState([]);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [filterMissing, setFilterMissing] = useState(
    selectedColumns.reduce((acc, col) => ({ ...acc, [col]: false }), {})
  );
  const tooltipRef = useRef(null);
  const headerRef = useRef(null);

  if (!data || data.length === 0 || selectedColumns.length === 0) {
    return <div>Select columns to view data</div>;
  }

  const columnsToRender = ["LSR number", "Study name", ...selectedColumns];

  const handleFilterToggle = (column) => {
    setFilterMissing((prev) => ({ ...prev, [column]: !prev[column] }));
  };

  const handleMouseEnter = (e, column) => {
    const classIds = ontologyDictionary["label_to_class"][column];
    if (!classIds) return;
    const classes = classIds.map((id) => {
      const ontologyClass = ontologyDictionary["ontology"][id];
      return {
        id,
        label: ontologyClass.label,
        definition: ontologyClass.definition,
      };
    });

    const rect = e.target.getBoundingClientRect();
    setTooltipContent(classes);
    setShowTooltip(true);

    setTimeout(() => {
      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;
        const tooltipHeight = tooltipRect.height;

        let top = rect.bottom + window.scrollY;
        let left = rect.left + window.scrollX;

        if (left + tooltipWidth > window.innerWidth) {
          left = window.innerWidth - tooltipWidth - 10;
        }
        if (left < 0) {
          left = 10;
        }
        if (top + tooltipHeight > window.innerHeight + window.scrollY) {
          top = rect.top + window.scrollY - tooltipHeight - 10;
        }

        setTooltipPosition({ top, left });
      }
    }, 0);
  };

  const handleMouseLeave = (e) => {
    const relatedTarget = e.relatedTarget;
    const NODE_TYPE_ELEMENT = 1;

    if (relatedTarget && relatedTarget.nodeType === NODE_TYPE_ELEMENT) {
      if (
        !headerRef.current?.contains(relatedTarget) &&
        !tooltipRef.current?.contains(relatedTarget)
      ) {
        setShowTooltip(false);
        setTooltipContent([]);
      }
    } else {
      setShowTooltip(false);
      setTooltipContent([]);
    }
  };

  // Filter the data based on both the "Filter missing values" checkbox and always filtering out rows with no data
  const filteredData = data.filter(
    (row) =>
      !selectedColumns.every((column) =>
        MISSING_VALUES.includes(row[column])
      ) &&
      !selectedColumns.some(
        (column) =>
          filterMissing[column] && MISSING_VALUES.includes(row[column])
      )
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            {columnsToRender.map((column) => (
              <th
                key={column}
                ref={headerRef}
                className="border p-2 bg-gray-100 hover:bg-blue-100"
                onMouseEnter={(e) => handleMouseEnter(e, column)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="flex flex-col items-center">
                  <span>{column}</span>
                  <label className="flex items-center font-normal text-sm mt-5">
                    <input
                      type="checkbox"
                      checked={filterMissing[column] || false}
                      onChange={() => handleFilterToggle(column)}
                      className="mr-2"
                    />
                    Filter missing values
                  </label>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredData.map((row, index) => (
            <tr key={index} className="border-b">
              {columnsToRender.map((column, columnIndex) => (
                <td
                  key={`${index}-${column}`}
                  className={`border p-2 ${
                    row[column] === null ? "no-data" : ""
                  }`}
                >
                  {columnIndex === 0 ? (
                    // Render HTML content for the first column
                    <div
                      className="cursor-pointer"
                      dangerouslySetInnerHTML={{ __html: row[column] }}
                    />
                  ) : (
                    // Render plain text for other columns
                    row[column]
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={handleMouseLeave}
      >
        <TooltipTable
          ref={tooltipRef}
          classes={tooltipContent}
          position={tooltipPosition}
          visible={showTooltip}
        />
      </div>
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
        : prev.filter(
            (col) =>
              !columns.some((c) => JSON.stringify(c) === JSON.stringify(col))
          );
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Data Table</h2>
          <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded">
            Download CSV
          </button>
        </div>
        <CSVDataViewer data={mergedData} selectedColumns={selectedColumns} />
      </div>
    </div>
  );
};

export default HierarchicalDataViewer;
