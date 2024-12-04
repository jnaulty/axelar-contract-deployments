'use strict';

const { Keypair, toSerializedSignature } = require('@mysten/sui/cryptography');
const { Signer } = require('@mysten/sui/cryptography');
const { Secp256k1Keypair } = require('@mysten/sui/keypairs/secp256k1');
const { Secp256k1PublicKey } = require('@mysten/sui/keypairs/secp256k1');
const { Ed25519PublicKey } = require('@mysten/sui/keypairs/ed25519');
const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid').default;
const Sui = require('@mysten/ledgerjs-hw-app-sui').default;
const { toB64 } = require('@mysten/sui/utils');
const { publicKeyFromRawBytes } = require('@mysten/sui/verify');


class LedgerSigner extends Signer {
    constructor() {
        super();
        this.path = "44'/784'/0'/0'/0'";
        this.sui = null;
    }

    async init() {
        try {
            if (!this.sui) {
                this.sui = await this.getSuiTransport();
                await this.sui.getPublicKey(this.path);
            }
            return this;
        } catch (error) {
            if (error.message.includes('cannot open device')) {
                throw new Error(
                    'Cannot connect to Ledger device. Please ensure:\n' +
                    '1. Ledger device is connected\n' +
                    '2. Sui app is open on the device\n' +
                    '3. Device is unlocked\n' +
                    '4. No other applications are using the device'
                );
            }
            
            throw error;
        }
    }

    async getPublicKey() {
        if (!this.sui) {
            await this.init();
        }
        return await this.sui.getPublicKey(this.path);
    }

    async toSuiAddress() {
        if (!this.sui) {
            await this.init();
        }
        return `0x${(await this.sui.getPublicKey(this.path)).address.toString('hex')}`;
    }

    async signTransaction(bytes) {
        if (!this.sui) {
            await this.init();
        }

        const ledgerPublicKey = await this.getPublicKey();
        const publicKey = new Ed25519PublicKey(ledgerPublicKey.publicKey);

        return {
            signature: toSerializedSignature({
                ...(await this.sui.signTransaction(this.path, bytes)),
                signatureScheme: 'ED25519',
                publicKey
            })
        };
    }

    async getSuiTransport(){
        return new Sui(await TransportNodeHid.create());
    };
}

module.exports = {
    LedgerSigner,
};
