import express from "express"

const route = express.Router()
route.post("/run",(req,res)=>{
    const {repositoryUrl} = req.body
    res.json({
        message:"repositry received",
        repositoryUrl
    })
})

export default route