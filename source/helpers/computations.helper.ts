import moment from "moment";

export const computeAccumulatedReturns = ({
    duration,
    roi,
    amount,
}: {
    duration: number;
    roi: number;
    amount: number;
}) => {
    return computeReturns({ amount, roi }) * duration;
};

export const computeReturns = ({
    amount,
    roi,
}: {
    amount: number;
    roi: number;
}) => {
    return (amount * roi) / 100;
};

export const expectedPayout = ({
    amount,
    roi,
}: {
    amount: number;
    roi: number;
}) => {
    return amount + computeReturns({ amount, roi });
};

export const computeDurationDifference = ({
    start_date,
    end_date,
}: {
    start_date: Date;
    end_date: Date;
}) => {
    return moment(new Date(end_date)).diff(
        moment(new Date(start_date)),
        "year",
        true
    );
};

export const computeDividends = ({
    amount,
    roi,
    duration,
}: {
    amount: number;
    roi: number;
    duration: number;
}) => {
    return (computeReturns({ amount, roi }) / duration) * 3;
};
