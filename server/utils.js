import BigNumber from 'bignumber.js'

export function toBN(x) {
    return new BigNumber(x.toString())
}

export function hexToBuffer(hex) {
    if (hex.indexOf('0x') === 0) {
        hex = hex.slice(2)
    }
    return Buffer.from(hex, 'hex')
}

// Awaitable version of setTimeout
export function timeout(msec) {
    return new Promise(resolve => {
        setTimeout(resolve, msec)
    })
}

// Awaitable tx receipt
export function receipt(tx) {
    return new Promise((resolve, reject) => {
        tx.on('receipt', resolve)
        tx.on('error', reject)
    })
}

export function onTxHash(tx) {
    return new Promise((resolve, reject) => {
        tx.on('transactionHash', resolve)
    })
}

export function* enumerate(list) {
    for (let i = 0; i < list.length; i++) {
        yield [i, list[i]]
    }
}


export function parseCid(cid) {
    const cidStr = hexToBuffer(cid).toString()
    const parts = cidStr.split(':')
    let type = 'unknown'
    if (parts.length >= 2) {
        type = parts[0]
    }

    switch (type) {
        case 'yt':
            const ytid = parts[1].slice(0, 11)
            return [type, ytid]
        case 'decrypt':
            const id = parts[1].slice(0, parts[1].indexOf('\0'))
            return [type, id]
        case 'unknown':
        default:
            return [type, cid]
    }
}


export class ValidationError extends Error {}


