import type { ServerInit } from '@sveltejs/kit/hooks';
import { getConfig } from '#lib/server/core/config.ts';

// Refuse to start on invalid env.
export const init: ServerInit = () => {
	getConfig();
};
