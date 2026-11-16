import { TopBar } from "./SiteChrome";

export function Bone({ width = "8em", block = false }: { width?: string; block?: boolean }) {
  return <span className={block ? "bone block" : "bone"} style={{ width }} aria-hidden="true" />;
}

export function SkeletonRows({ columns, rows = 4 }: { columns: string[]; rows?: number }) {
  return (
    <div className="table-wrap" aria-busy="true">
      <table className="data">
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column} data-label={column}><Bone width={column === columns[0] ? "70%" : "50%"} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PaySkeleton({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="page-light">
      <TopBar />
      <div className="narrow pad-lg stack" aria-busy="true">
        <p className="hint">{kicker}</p>
        <h1 className="display" style={{ fontSize: 46 }}>{title}</h1>
        <div className="form-card" style={{ minHeight: 447 }}>
          <Bone block width="100%" />
          <Bone block width="86%" />
          <Bone block width="64%" />
          <span className="bone block button" />
        </div>
      </div>
    </div>
  );
}
