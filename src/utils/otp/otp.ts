export const generateNumberOtp = ():number => {
    return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000);
}
export const generateLoginOtp = ():number => {
    return Math.floor(Math.random() * 90 + 10);
}