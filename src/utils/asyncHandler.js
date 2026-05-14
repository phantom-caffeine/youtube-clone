const asynHadler = (requestHandler) => {
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err));
    }
}

export default asynHadler;


// const asynHadler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 400).json({
//             success : false,
//             message : error.message || "Something went wrong"
//         });
//     }
// }