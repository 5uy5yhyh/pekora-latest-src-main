import Document, { Html, Head, Main, NextScript } from 'next/document'
import React from 'react'
import { SheetsRegistry, JssProvider, createGenerateId } from 'react-jss'

export default class JssDocument extends Document {
    static async getInitialProps(ctx) {
        const registry = new SheetsRegistry()
        const generateId = createGenerateId()
        const originalRenderPage = ctx.renderPage

        ctx.renderPage = () =>
            originalRenderPage({
                enhanceApp: (App) => (props) => (
                    <JssProvider registry={registry} generateId={generateId}>
                        <App {...props} />
                    </JssProvider>
                ),
            })

        const initialProps = await Document.getInitialProps(ctx)

        return {
            ...initialProps,
            styles: (
                <>
                    {initialProps.styles}

                    <link
                        href="https://fonts.googleapis.com/css2?family=Source+Sans+Pro:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700;1,900&amp;display=swap"
                        rel="stylesheet"
                    />

                    <link
                        href="http://localhost:5000/fonts/gotham1.css"
                        rel="stylesheet"
                    />

                    <style id="server-side-styles">
                        {registry.toString()}
                    </style>
                </>
            ),
        }
    }

    render() {
        return (
            <Html>
                <Head>
                    <script src="/js/3d/three-r137/three.js" />
                    <script src="/js/3d/MTLLoaderr.js" />
                    <script src="/js/3d/OBJLoaderr.js" />
                    <script src="/js/3d/RobloxOrbitControls.js" />
                    <script src="/js/3d/tween.js" />
                </Head>

                <body>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        )
    }
}