import { Contract, Signer } from "ethers";
import { readFileSync } from "fs";

export class BaseContract {
    protected instance: any

    constructor(instance: any) {
        this.instance = instance
    }

    public connect(signer: Signer): this {
        const instance = this.instance.connect(signer)
        return this.constructor(instance)
    }
}