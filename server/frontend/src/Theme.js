import url from 'url'
import * as React from 'react'
import { connect } from 'react-redux'
import Typography from '@material-ui/core/Typography'
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles'

import VideoLeaderboardTable from './VideoLeaderboardTable'
import DecryptArticleTable from './DecryptArticleTable'
import ujoLogo from './images/ujo.png'
import ujoEthereumLogo from './images/ethereum.png'
import ujoCoinsImage from './images/coins.gif'

const ujoTheme = createMuiTheme({
    palette: {
        primary: {
            main: '#ec007f',
            light: '#484848',
            dark: '#232E6B',
        },
        secondary: {
            main: '#3f51b5',
        },
    },

    chart: {
        logoComponent: () => <img src={ujoLogo} style={{ width: 130, height: 60, marginRight: 20 }} />,
        pageTitleStyles: { fontFamily: 'Arcade', color: '#ec007f', fontSize: '4.2rem', height: 60, marginTop: -8 },
        ethereumLogo: () => <img src={ujoEthereumLogo} style={{
            width: 32,
            verticalAlign: 'bottom',
            filter: 'hue-rotate(212deg) grayscale(33%) brightness(1.6)',
        }} />,
        coinsImage: () => <img src={ujoCoinsImage} style={{
            width: 56,
            verticalAlign: 'bottom',
        }} />,
        accountBalancesFontStyles: {
            color: '#ec007f',
            fontFamily: `'Light Pixel'`,
            fontSize: '1.4rem',
        },
        cardTitleText: 'Electronic',
        textSubmitCTA: 'Submit a song',
        bgColorCardHeader: '#8428ff',
        fontColorCardHeader: 'white',
        fontCardHeader: 'Roboto',
        bgColorBody: '#313131',
        bgColorBackdrop: '#212121',
        leaderboardComponent: () => <VideoLeaderboardTable />,
        mapContentLinkToCid: async (contentLink) => {
            const { query: { v } } = url.parse(contentLink, true)
            const buf = Buffer.alloc(32)
            buf.write('yt:' + v)
            return buf
        },
    },
})



const decryptTheme = createMuiTheme({
    palette: {
        primary: {
            main: 'rgb(116, 95, 222)',
        },
        secondary: {
            main: '#ec007f',
        },
    },
    chart: {
        logoComponent: () => (
            <div style={{display: 'flex'}}>
                <img src="https://decrypt.co/_next/static/images/decrypt-mark-100-126572b6cf17a18ce5342c3f065366c1.png" style={{
                    width: 68,
                    height: 72,
                }} />
                <img src="https://decrypt.co/_next/static/images/decrypt-word-300-ff23aa54ead4a22282d82b559fcce0ff.png" style={{
                    marginTop: 18,
                    marginLeft: 20,
                    width: 200,
                    height: 50,
                }} />
            </div>
        ),
        pageTitleStyles: {
            // fontFamily: `'Canela Black'`,
            fontFamily: 'Helvetica',
            fontWeight: 100,
            color: 'rgb(116, 95, 222)',
            fontSize: '3.3rem',
            height: 60,
            marginLeft: 11,
            letterSpacing: -1,
        },
        bgColorBody: 'white',
        bgColorBackdrop: 'white',
        ethereumLogo: () => <img src="https://camo.githubusercontent.com/9d8eb1dfbe5c093b8df1ac3935730dbb991c47a1/68747470733a2f2f73332d75732d776573742d322e616d617a6f6e6177732e636f6d2f737667706f726e2e636f6d2f6c6f676f732f657468657265756d2e737667" style={{
            width: 32,
            verticalAlign: 'bottom',
        }} />,
        coinsImage: () => <img src="https://conceptdraw.com/a1708c3/p9/preview/640/pict--coins-currency---vector-stencils-library.png--diagram-flowchart-example.png" style={{
            width: 56,
            verticalAlign: 'bottom',
        }} />,
        accountBalancesFontStyles: {
            color: '#afafaf',
            fontFamily: `'Canela Black'`,
            fontSize: '1.7rem',
            color: '#424242',
            // width: 27,
            // fontWeight: 700,
        },
        textSubmitCTA: 'Submit an article',
        cardTitleText: 'Layer 2 solutions',
        bgColorCardHeader: '#444444',
        fontColorCardHeader: 'white',
        fontCardHeader: `'Canela Black'`,
        leaderboardComponent: () => <DecryptArticleTable />,
        mapContentLinkToCid: async (contentLink) => {
            const parsed = url.parse(contentLink, true)
            const id = parsed.pathname.split('/')[1]
            const buf = Buffer.alloc(32)
            buf.write('decrypt:' + id)
            return buf
        },
    },
})


function Theme(props) {
    let theme = ujoTheme
    if (props.theme === 'decrypt') {
        theme = decryptTheme
    }

    return (
      <MuiThemeProvider theme={theme}>
          <Typography component="div" style={{ width: '100%', height: '100%', minHeight: '100vh' }}>
              {props.children}
          </Typography>
      </MuiThemeProvider>
    )
}

const mapStateToProps = (state) => {
    return {
        theme: state.chart.theme,
    }
}

export default connect(mapStateToProps)(Theme)
