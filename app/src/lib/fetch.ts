export type Result<T> =
    | { ok: true; value: T }
    | { ok: false; message: string; error?: Error };

export const fetchDownloadUrl = async (
    url: string,
): Promise<Result<string>> => {
    try {
        const resp = await fetch(url);

        if (!resp.ok) {
            return {
                ok: false,
                message: "ダウンロードURLの取得に失敗しました",
                error: new Error(`HTTP error!: ${resp.statusText}`),
            };
        }

        const text = await resp.text();
        return { ok: true, value: text };
    } catch (error) {
        return {
            ok: false,
            message: "ダウンロードURLの取得に失敗しました",
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};

export const downloadFile = async (
    url: string,
): Promise<Result<ArrayBuffer>> => {
    try {
        const resp = await fetch(url);

        if (!resp.ok) {
            return {
                ok: false,
                message: "zipファイルの取得に失敗しました",
                error: new Error(`HTTP error!: ${resp.statusText}`),
            };
        }

        return { ok: true, value: await resp.arrayBuffer() };
    } catch (error) {
        return {
            ok: false,
            message: "zipファイルの取得に失敗しました",
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};
