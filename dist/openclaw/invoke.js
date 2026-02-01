export async function invokeTool(gatewayBaseUrl, tool, args) {
    const res = await fetch(`${gatewayBaseUrl.replace(/\/$/, "")}/tools/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, args })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        return {
            content: [
                { type: "text", text: `Tool invoke failed (${res.status}): ${JSON.stringify(data)}` }
            ]
        };
    }
    // Expecting OpenClaw tool result shape; pass through.
    return data;
}
//# sourceMappingURL=invoke.js.map