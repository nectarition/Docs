// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'ねくたりDocs',
			customCss: [
				'@fontsource-variable/noto-sans-jp',
				'./src/styles/custom.css',
			],
			defaultLocale: 'root',
			locales: {
				root: {
					label: '日本語',
					lang: 'ja-JP',
				}
			},
			social: {
				github: 'https://github.com/nectarition',
			},
			sidebar: [
				{
					label: 'はじめに',
					autogenerate: { directory: 'about' }
				},
				{
					label: 'ドキュメント',
					autogenerate: { directory: 'docs' }
				},
			],
		}),
	],
});
