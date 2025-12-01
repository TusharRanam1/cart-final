import { authenticate } from "../shopify.server";

export const loader = async({request})=>{
await authenticate.admin(request);
return null;
};


export default function AppSupportPage(){
    return(
        <div style={{display:"flex", justifyContent:"center", alignItems:"center",height:"100vh"}}>
        <div style={{display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", width:"80vh",border: "2px solid black"}}>
        <text style={{"color":"red", }}>Cart Upsell</text>
        </div>
        </div>
    );
}