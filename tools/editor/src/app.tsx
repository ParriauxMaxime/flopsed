import { css } from "@emotion/react";

const containerStyle = css`
	display: flex;
	height: 100vh;
	width: 100vw;
`;

const sidebarStyle = css`
	width: 220px;
	background: #16161c;
	border-right: 1px solid #2a2a35;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 8px;
`;

const mainStyle = css`
	flex: 1;
	padding: 24px;
	overflow: auto;
`;

export function App() {
	return (
		<div css={containerStyle}>
			<nav css={sidebarStyle}>
				<h2 css={css`font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px;`}>
					Editor
				</h2>
				<span css={css`color: #666; font-size: 13px;`}>No pages yet</span>
			</nav>
			<main css={mainStyle}>
				<h1 css={css`font-size: 20px; color: #ccc;`}>AGI Rush Editor</h1>
				<p css={css`margin-top: 12px; color: #777;`}>Select a page from the sidebar to begin editing.</p>
			</main>
		</div>
	);
}
