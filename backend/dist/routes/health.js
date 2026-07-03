export const healthRoute = function (app) {
    app.get("/health", async () => {
        return { ok: true };
    });
};
