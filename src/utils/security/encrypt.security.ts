import CryptoJS from "crypto-js";


export const generateEncryption = async ({ plainText, secretKey = process.env.ENC_SECRET_KEY as string }: {
    plainText: string,
    secretKey?: string
}
):Promise<string> => {
    return CryptoJS.AES.encrypt(plainText, secretKey).toString();
};


export const decryptEncryption = async ({ciphertext, secretKey= process.env.ENC_SECRET_KEY as string }: {
    ciphertext: string,
    secretKey?: string  
}): Promise<string> => {
    return CryptoJS.AES.decrypt(ciphertext, secretKey).toString(CryptoJS.enc.Utf8);
};