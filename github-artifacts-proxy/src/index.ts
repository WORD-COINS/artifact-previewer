export interface Env {
	GITHUB_TOKEN: string;
	CORS_ORIGIN: string;
	OWNER_NAME: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const defaultResponseHeaders = {
			'Content-Type': 'text/plain;charset=utf-8',
			'Cache-Control': 'no-cache',
			'Access-Control-Allow-Origin': env.CORS_ORIGIN,
		};

		if (request.method !== 'GET') {
			return new Response('Method Not Allowed', {
				status: 405,
				headers: defaultResponseHeaders,
			});
		}

		if (env.CORS_ORIGIN !== '*' && request.headers.get('Origin') !== env.CORS_ORIGIN) {
			return new Response('Origin Not Allowed', {
				status: 403,
				headers: defaultResponseHeaders,
			});
		}

		const params = new URLSearchParams(new URL(request.url).search);

		const apiParams: DownloadParams = {
			owner: params.get('owner') ?? '',
			repo: params.get('repo') ?? '',
			artifact_id: params.get('artifact_id') ?? '',
			archive_format: 'zip',
		};

		const undefinedParams = Object.entries(apiParams)
			.map((param) => (param[1] === '' ? param[0] : null))
			.filter(Boolean);
		if (undefinedParams.length > 0) {
			return new Response(`${undefinedParams.join(', ')}が指定されていません`, {
				status: 400,
				headers: defaultResponseHeaders,
			});
		}

		const resp = await fetchDownloadUrl(env.GITHUB_TOKEN, apiParams);
		if (!resp.ok) {
			return new Response(resp.message, {
				status: resp.status ?? 500,
				headers: defaultResponseHeaders,
			});
		}
		return new Response(resp.value, {
			status: 200,
			headers: defaultResponseHeaders,
		});
	},
} satisfies ExportedHandler<Env>;

type Result<T> = { ok: true; value: T } | { ok: false; message: string; error?: Error; status?: number };

type DownloadParams = {
	owner: string;
	repo: string;
	artifact_id: string;
	archive_format: 'zip';
};

const fetchDownloadUrl = async (token: string, params: DownloadParams): Promise<Result<string>> => {
	// artifactの署名付きダウンロードリンクを取得するGitHub APIを呼び出す
	// https://docs.github.com/ja/rest/actions/artifacts?apiVersion=2022-11-28#download-an-artifact
	try {
		const resp = await fetch(
			`https://api.github.com/repos/${params.owner}/${params.repo}/actions/artifacts/${params.artifact_id}/${params.archive_format}`,
			{
				redirect: 'manual', // リダイレクトを手動で処理する
				headers: {
					'User-Agent': 'GitHub-Artifact-Downloader',
					Accept: 'application/vnd.github+json',
					Authorization: `Bearer ${token}`,
					'X-GitHub-Api-Version': '2022-11-28',
				},
			},
		);

		// 3xx系のステータスコードの場合
		if (300 <= resp.status && resp.status < 400) {
			const redirectUrl = resp.headers.get('location');

			if (!redirectUrl) {
				return { ok: false, message: 'ダウンロードURLが取得できませんでした', status: 404 };
			}
			return { ok: true, value: redirectUrl };
		}

		// それ以外でエラーの場合
		if (!resp.ok) {
			console.log(await resp.text());
			return { ok: false, message: `ダウンロードURLを取得中にGitHub APIからエラーが返されました: ${resp.statusText}`, status: resp.status };
		}

		// エラーでなくリダイレクトもされなかった場合
		return { ok: false, message: 'ダウンロードURLが取得できませんでした', status: 404 };
	} catch (error) {
		return { ok: false, message: 'ダウンロードURLを取得中にGitHub APIへのリクエストでエラーが発生しました' };
	}
};
