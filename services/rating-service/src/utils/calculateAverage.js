/**
 * Calculate average score from a list of ratings.
 * @param {Array<{score: number}>} ratings
 * @returns {{ average: number, count: number }}
 */
const calculateAverage = (ratings) => {
    if (!ratings || ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.score, 0);
    return {
        average: Math.round((sum / ratings.length) * 10) / 10,
        count: ratings.length
    };
};

module.exports = { calculateAverage };
