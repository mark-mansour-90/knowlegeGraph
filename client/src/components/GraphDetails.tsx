interface GraphDetailsProps {
  graphId: number | null;
  isSavingTopics: boolean;
  renameText: string;
  setRenameText: (text: string) => void;
  isRenaming: boolean;
  renameError: string | null;
  renameGraph: () => void;
  editTopicsText: string;
  setEditTopicsText: (text: string) => void;
  saveTopics: () => void;
  saveTopicsError: string | null;
}

const GraphDetails: React.FC<GraphDetailsProps> = ({
  graphId,
  isSavingTopics,
  renameText,
  setRenameText,
  isRenaming,
  renameError,
  renameGraph,
  editTopicsText,
  setEditTopicsText,
  saveTopics,
  saveTopicsError,
}) => {

  return (
    <>
      <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>
          Edit selected graph
        </div>

        {!graphId ? (
          <div style={{ color: "#666" }}>
            Select a graph from the table to edit it.
          </div>
        ) : (
          <>
            {/* Rename */}
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  flex: 1,
                  minWidth: 240,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span style={{ fontWeight: 600 }}>Graph name</span>
                <input
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  style={{
                    padding: 10,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                />
              </label>
              <button
                onClick={renameGraph}
                disabled={isRenaming}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  color: "white",
                  background: "#166050",
                  cursor: isRenaming ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  opacity: isRenaming ? 0.7 : 1,
                }}
              >
                {isRenaming ? "Saving..." : "Save name"}
              </button>
            </div>
            {renameError ? (
              <div style={{ marginTop: 8, color: "#b00020", fontWeight: 700 }}>
                {renameError}
              </div>
            ) : null}

            {/* Topics edit */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>
                Topics (one per line)
              </div>
              <textarea
                value={editTopicsText}
                onChange={(e) => setEditTopicsText(e.target.value)}
                rows={8}
                style={{
                  width: "100%",
                  padding: "10px 0",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  marginTop: 8,
                  alignItems: "center",
                }}
              >
                <button
                  onClick={saveTopics}
                  disabled={isSavingTopics}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    color: "white",
                    background: "#166050",
                    cursor: isSavingTopics ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    opacity: isSavingTopics ? 0.7 : 1,
                  }}
                >
                  {isSavingTopics ? "Saving..." : "Save topics"}
                </button>
                {saveTopicsError ? (
                  <div style={{ color: "#b00020", fontWeight: 700 }}>
                    {saveTopicsError}
                  </div>
                ) : null}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#777" }}>
                Saving topics replaces the graph’s topics and clears visual
                links (since nodes changed).
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default GraphDetails;
