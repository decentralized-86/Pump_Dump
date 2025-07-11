const axios = require('axios');
require('dotenv').config();

async function getProjectMetadata(projectTokenAddress){
    try{
        const options = {
            method: 'POST',
            url: `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
            headers: {
              'Content-Type': 'application/json',
            },
            data: {
              includeOffChain: false,
              disableCache: false,
              mintAccounts: [
                projectTokenAddress,
              ],
            },
        };
        const response = await axios(options);
        const result = response.data;
        const metadata = result[0]?.onChainMetadata?.metadata?.data;
        const resp = await axios.get(metadata.uri, {
          maxRedirects: 0,
          validateStatus: (status) => status === 302
        });
        
        return {
            name: metadata?.name,
            symbol: metadata?.symbol,
            uri: resp.data?.image|| null,
        };  
    }catch(err){
        console.log(err)
        throw new Error("Error fetching token details metadata")
    }
}

module.exports = { getProjectMetadata };