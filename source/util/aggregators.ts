export const multiply = (a: string | number, b: string | number) => {
    return {
        $multiply: [a, b],
    };
};

export const divide = (a: string | number, b: string | number) => {
    return {
        $divide: [a, b],
    };
};

export const subtract = (a: string | number, b: string | number) => {
    return {
        $subtract: [a, b],
    };
};
