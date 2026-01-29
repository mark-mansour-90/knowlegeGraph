interface Graph {
  id: number;
  name: string;
  created_at: string;
}

interface GraphsListProps {
  graphs: Graph[];
  isLoading?: boolean;
  error?: string;
  graphId?: number | null;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

const GraphsList: React.FC<GraphsListProps> = ({
  graphs,
  isLoading,
  error,
  graphId,
  onOpen,
  onDelete,
  isDeleting,
}) => {
  return (
    <>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Saved graphs</div>
      {isLoading && <div style={{ color: "#555" }}>Loading...</div>}
      {error ? (
        <div style={{ color: "#b00020", fontWeight: 700 }}>{error}</div>
      ) : null}

      {!isLoading && !error && graphs.length === 0 ? (
        <div style={{ color: "#666" }}>No graphs yet. Generate one above.</div>
      ) : null}

      {!error && graphs.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "center",
                    padding: 8,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    textAlign: "center",
                    padding: 8,
                    borderBottom: "1px solid #eee",
                  }}
                >
                  Created
                </th>
                <th style={{ padding: 8, borderBottom: "1px solid #eee" }} />
              </tr>
            </thead>
            <tbody>
              {graphs.map((g) => (
                <tr
                  key={g.id}
                  style={{
                    background: graphId === g.id ? "#014c3c" : "transparent",
                  }}
                >
                  <td
                    style={{
                      padding: 8,
                      borderBottom: "1px solid #f2f2f2",
                      fontWeight: 600,
                    }}
                  >
                    {g.name}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      borderBottom: "1px solid #f2f2f2",
                      color: "#666",
                    }}
                  >
                    {new Date(g.created_at).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: 8,
                      
                      textAlign: "right",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <button
                      onClick={() => onOpen(g.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        color: "white",
                        background: "#166050",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Open
                    </button>
                    <button
                      onClick={() => onDelete(g.id)}
                      disabled={isDeleting}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #ddd",
                        color: "white",
                        background: "#601616",
                        cursor: isDeleting ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                      title="Delete graph"
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
};

export default GraphsList;
