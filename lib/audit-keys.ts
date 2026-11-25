// Redis keys for an audit in progress. Shared by the MCP server and the live activity shown in the panel.
export const sessionKey = (id: string) => `audit:${id}`;
export const resultsKey = (id: string) => `audit:${id}:results`;
export const depsKey = (id: string) => `audit:${id}:deps`;
export const reportLockKey = (id: string) => `audit:${id}:report`;
export const reportKey = (id: string) => `report:${id}`;
