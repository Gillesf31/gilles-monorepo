export class Recipe {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly ingredients: string[],
    readonly instructions: string[],
  ) {}
}
