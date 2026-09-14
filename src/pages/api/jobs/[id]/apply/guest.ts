import type { APIRoute } from 'astro';

export const prerender = false;

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
};

function getBackendBaseUrl(): string {
	const envUrl =
		(typeof process !== 'undefined' && (process.env?.JOB_PORTAL_API_URL || process.env?.JOB_PORTAL_BASE_URL)) ||
		import.meta.env.JOB_PORTAL_API_URL ||
		import.meta.env.JOB_PORTAL_BASE_URL ||
		'https://demo1.varundigitalmedia.com/jobportal/public';

	return envUrl.replace(/\/+$/, '');
}

function resolveTargetUrl(jobId: string): string {
	const base = getBackendBaseUrl();
	if (base.endsWith('/api')) {
		return `${base}/jobs/${jobId}/apply/guest`;
	}
	return `${base}/api/jobs/${jobId}/apply/guest`;
}

export const OPTIONS: APIRoute = async () => {
	return new Response(null, {
		status: 204,
		headers: CORS_HEADERS,
	});
};

export const GET: APIRoute = async ({ params }) => {
	const jobId = params.id;
	return new Response(
		JSON.stringify({
			status: true,
			message: `Guest application endpoint for Job ID #${jobId}. Send a POST request with multipart/form-data.`,
			fields: {
				name: 'string (required)',
				email: 'string (required)',
				phone: 'string (optional)',
				cover_letter: 'string (optional)',
				resume: 'file (required, .pdf, .doc, .docx)',
			},
		}),
		{
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				...CORS_HEADERS,
			},
		}
	);
};

export const POST: APIRoute = async ({ params, request }) => {
	try {
		const jobId = params.id?.trim();
		if (!jobId) {
			return new Response(
				JSON.stringify({
					status: false,
					message: 'Job ID is required in URL parameter (e.g. /api/jobs/10/apply/guest).',
				}),
				{
					status: 400,
					headers: {
						'Content-Type': 'application/json',
						...CORS_HEADERS,
					},
				}
			);
		}

		const targetFormData = new FormData();
		const contentType = request.headers.get('content-type') || '';

		if (contentType.includes('application/json')) {
			const bodyJson = await request.json().catch(() => ({}));
			for (const [key, value] of Object.entries(bodyJson)) {
				if (value !== undefined && value !== null) {
					targetFormData.append(key, String(value));
				}
			}
		} else {
			const incomingFormData = await request.formData();
			for (const [key, value] of incomingFormData.entries()) {
				targetFormData.append(key, value);
			}
		}

		const primaryUrl = resolveTargetUrl(jobId);
		const fallbackUrl = `https://demo1.varundigitalmedia.com/jobportal/public/api/jobs/${jobId}/apply/guest`;

		let response: Response;
		try {
			response = await fetch(primaryUrl, {
				method: 'POST',
				headers: {
					Accept: 'application/json',
				},
				body: targetFormData,
			});
		} catch (err: any) {
			if (primaryUrl !== fallbackUrl) {
				try {
					response = await fetch(fallbackUrl, {
						method: 'POST',
						headers: {
							Accept: 'application/json',
						},
						body: targetFormData,
					});
				} catch (fallbackErr: any) {
					return new Response(
						JSON.stringify({
							status: false,
							message: fallbackErr.message || 'Unable to connect to upstream job portal.',
						}),
						{
							status: 502,
							headers: {
								'Content-Type': 'application/json',
								...CORS_HEADERS,
							},
						}
					);
				}
			} else {
				return new Response(
					JSON.stringify({
						status: false,
						message: err.message || 'Unable to connect to upstream job portal.',
					}),
					{
						status: 502,
						headers: {
							'Content-Type': 'application/json',
							...CORS_HEADERS,
						},
					}
				);
			}
		}

		const text = await response.text();
		let data: any;
		try {
			data = JSON.parse(text);
		} catch (_) {
			data = { message: text || `Server returned status ${response.status}` };
		}

		return new Response(JSON.stringify(data), {
			status: response.status,
			headers: {
				'Content-Type': 'application/json',
				...CORS_HEADERS,
			},
		});
	} catch (err: any) {
		return new Response(
			JSON.stringify({
				status: false,
				message: err.message || 'Error processing guest application submission.',
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					...CORS_HEADERS,
				},
			}
		);
	}
};
