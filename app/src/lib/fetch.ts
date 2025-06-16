import type { Result } from "common/util";

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
    onProgress: (progress: number) => void = () => {},
): Promise<Result<Response>> => {
    try {
        const resp = await fetch(url);

        if (!resp.ok) {
            return {
                ok: false,
                message: `zipファイルの取得に失敗しました: ${resp.statusText}`,
                error: new Error(`HTTP error!: ${resp.statusText}`),
            };
        }

        const size = Number(resp.headers.get("Content-Length") ?? "-1");

        return {
            ok: true,
            value: new Response(
                new ReadableStream({
                    async start(controller) {
                        const reader = resp.body?.getReader();
                        let chunk = 0;

                        async function read() {
                            const result = await reader?.read();

                            if (result && !result.done) {
                                chunk += result.value.length;
                                onProgress(chunk / size);

                                controller.enqueue(result.value);
                                return await read();
                            }
                        }
                        await read();
                        controller.close();
                    },
                }),
            ),
        };
    } catch (error) {
        return {
            ok: false,
            message: "zipファイルの取得に失敗しました",
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
};
