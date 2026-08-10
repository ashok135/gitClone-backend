import express from "express";
const route = express.Router()

route.get("/",(req,res)=>{
    res.status(200).json({
        status :"200",
        message:"Server running at http://localhost:5000"

    })
})
export default route