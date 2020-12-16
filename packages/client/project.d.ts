// https://github.com/Microsoft/TypeScript/issues/2709
declare module '*.fsh' {
    const _: string;
    export default _;
}
declare module '*.vsh' {
    const _: string;
    export default _;
}
