'use client';

import {   useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { create as ipfsHttpClient } from 'ipfs-http-client';
import { decryptByCJ, encryptByCJ, encryptData, getNewAccount } from '../utils/cypher'
import { env } from './../next.config'
import { getTemplateByTypeFile } from '../utils/common'
import Loader from './loader'
import { getWeb3Instance } from '../utils/web3';
import { GptResponse, Web3InstanceProps } from '../interfaces/types';

import Select from "react-tailwindcss-select"; 
import { generateImageByPrompt, getPromptByDescription } from '../utils/ai';

type AiData = {
  value: string,
  label: string
}

const auth =
  'Basic ' + Buffer.from(env.NEXT_PUBLIC_IPFS_KEY + ':' + env.NEXT_PUBLIC_IPFS_SECRET).toString('base64');

const OApi = env.OPENAI_API_KEY;

const client = ipfsHttpClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https',
  headers: {
    authorization: auth,
  },
});

const options: AiData[] = [
  { value: `${env.HUGGING_FACE_URL}`, label: "Stable Diffusion v2-1" },
  { value: "https://api-inference.huggingface.co/models/prompthero/openjourney", label: "prompthero/openjourney" },
  { value: "https://api-inference.huggingface.co/models/compVis/stable-diffusion-v1-4", label: "CompVis/stable-diffusion-v1-4" },
  { value: "https://api-inference.huggingface.co/models/eimiss/EimisAnimeDiffusion_1.0v", label: "eimiss/EimisAnimeDiffusion_1.0v" }
];

 
type FormInputs = {
  price: string, name: string, description: string, prompt: string, file: string
}

type InputsNames = keyof FormInputs
export default function CreateItem() {
  const [marketPlaceContract, setMarketPlaceContract] = useState(null || {} as any)
  const [encodedNftContract, setEncodedNftContract] = useState(null || {} as any)
  const [account, setAccount] = useState('')
  const [isUploadToIpfs, setIsUploadToIpfs] = useState(false)
  const [newPrivateKey, setNewPrivateKey] = useState('')
  const [enableMint, setEnableMint] = useState(false)
  const [base64FileData, setBase64FileData] = useState('')
  const [encryptedPrompt, setEncryptedPrompt] = useState('');
  const [encPrKByOwnerAddress, setEncPrKByOwnerAddress] = useState('');
  const [formInput, updateFormInput] = useState({} as FormInputs)
  const router = useRouter()
  const [isProcessMint, setIsProcessMint] = useState(false)
  const [isPromptEncoded, setIsPromptEncoded] = useState(false)
  const [typeFile, setTypeFile] = useState('')
  const [web3Utils, setWeb3Utils] = useState({} as any)
  const [ai, setAI] = useState({} as AiData);
  const [isGenImage, setIsGenImage] = useState(false)
  const [isGenPrompt, setIsGenPrompt] = useState(false)

  const inputName = useRef<HTMLInputElement>(null);
  const inputPrompt = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    generateKeys()
  }, [])

  useEffect(() => {
    getWeb3Instance()
      .then((inst: Web3InstanceProps) => {
        setAccount(inst.currentAddress)
        setMarketPlaceContract(inst.marketPlaceContract)
        setEncodedNftContract(inst.encNftContract)
        setWeb3Utils(inst.web3Utils)
      }).catch((err: any) => {
        console.log('err', err)
      })
  }, [])

  useEffect(() => {
    if (encryptedPrompt !== '' && newPrivateKey !== '') {
      const encryptPrivateKeyForNFTFile = async () => {
        const encData = await encryptData(account, newPrivateKey)
        if (encData !== '') {
          setEncPrKByOwnerAddress(encData)
        }
      }
      encryptPrivateKeyForNFTFile()

    }
  }, [newPrivateKey, encryptedPrompt]);

  useEffect(() => {
    if (inputName?.current?.value && inputPrompt?.current?.value) {
      updateFormInput({ ...formInput, name: inputName?.current?.value })
      updateFormInput({ ...formInput, prompt: inputName?.current?.value })
    }
  }, [inputName?.current?.value, inputPrompt?.current?.value]);

  const generateKeys = () => {
    const newIdentity = getNewAccount();
    setNewPrivateKey(newIdentity.privateKey);
  } 

  const encodePrompt = async () => {
    if (inputPrompt?.current?.value !== '' && newPrivateKey !== '') {
      const encData = encryptByCJ(String(inputPrompt?.current?.value), newPrivateKey)
      const decryptData = decryptByCJ(encData, newPrivateKey)
      console.log("🚀 ~ file: create-and-list-nft.tsx:131 ~ encodePrompt ~ decryptData:", decryptData)
      if (encData !== '') {
        setEncryptedPrompt(encData);
        setIsPromptEncoded(true);
      }
    }
  }

  const defineTypeFile = (base64Code: string) => {
    return base64Code.split(';')[0].split('/')[0].split(":")[1];
  }  

  const handleChange = async (value: any) => {
    console.log("value:", value);
    if(formInput.description !== '') {
      setIsGenPrompt(true)
      try{
        const gptResponse = await getPromptByDescription(formInput.description, value.label)
        if (gptResponse && inputPrompt.current && inputName.current) {
          inputName.current.value = gptResponse.titlePrompt;
          inputPrompt.current.value = gptResponse.prompt;
        }
      } catch (err) {
         console.error(
          "As an AI robot, I errored out."
        );
      } finally {
        setIsGenPrompt(false)
      }
      setAI(value)
    }
  }; 

  const generatedImage = useMemo(() => base64FileData, [base64FileData]);

  async function generateImage() {
    try {
      if (ai?.value && inputPrompt?.current?.value ) {
        setIsGenImage(true)
        
        const imgB64 = await generateImageByPrompt(ai?.value, inputPrompt.current.value );
       if(imgB64) {
         setTypeFile(defineTypeFile(imgB64)) 
         setBase64FileData(imgB64);
       } 
      }
    } catch (err) {
      console.error('err', err)
    } finally {
      setIsGenImage(false)
    }
  }


  useEffect(() => {
    const { name, description, price } = formInput;
    if (inputName?.current?.value && description && +price > 0 && encryptedPrompt && encPrKByOwnerAddress) {
      setEnableMint(true)

    } else {
      setEnableMint(false)
    }
  }, [formInput, encryptedPrompt, encPrKByOwnerAddress]);

  async function uploadToIPFS() {
    const { name, description, price } = formInput
    if (!inputName?.current?.value || !description || !price || !encryptedPrompt || !base64FileData) {
      return
    } else {

      try {
        const uploadedFile = await client.add(base64FileData)
        if (uploadedFile) {
          const uploadedImage = `https://caravan.infura-ipfs.io/ipfs/${uploadedFile.path}`;
          const data = JSON.stringify({
            // typeFile = 'image' hardcoded
            name: inputName?.current?.value, description: `${'image'};${description}. The image generated by model ${ai.label}`, prompt: encryptedPrompt, image: uploadedImage
          })
          const added = await client.add(data)
          const url = `https://caravan.infura-ipfs.io/ipfs/${added.path}`
          console.log("🚀 ~ file: create-and-list-nft.tsx ~ line 158 ~ uploadToIPFS ~ url", url)
          return url
        }

      } catch (error) {
        console.log('Error uploading file: ', error)
      } finally { 
        setIsUploadToIpfs(false)
      }
    }
  }

  async function listNFTForSale() {
    try {
      setIsUploadToIpfs(true)
      const url = await uploadToIPFS()

      setIsProcessMint(true)
      let listingFee = await marketPlaceContract.methods.getListingFee().call()
      listingFee = listingFee.toString()
      encodedNftContract.methods.mint(url, encPrKByOwnerAddress).send({
        from: account
      }).on('receipt', function (receipt: any) {
        // List the NFT
        const tokenId = receipt.events.NFTMinted.returnValues[0];
        console.log("🚀 ~ file: create-and-list-nft.tsx ~ line 199 ~ encodedNftContract.methods.mint ~ tokenId", tokenId)
        if (tokenId) {
          console.log('encodedNftContract.address', encodedNftContract._address)
          marketPlaceContract.methods.moveTokenForSell(tokenId, "Listing announce", web3Utils?.toWei(formInput.price, "ether"), encodedNftContract._address)//Web3.utils.toWei(formInput.price, "ether"))
            .send({ from: account, value: listingFee }).on('receipt', function (res: any) {
              console.log("🚀 ~ file: create-and-list-nft.tsx:194 ~ res:", res)
              console.log('listed')
              setIsProcessMint(false)
              router.push('/')
            });
        }
      }).on('error', (err: any) => {
        console.log("🚀 ~ file: create-and-list-nft.tsx ~ line 200 ~ encodedNftContract.methods.mint ~ err", err)
        setIsProcessMint(false)
      });
    } catch (err) {
      console.log('err :>>', err)
    }
  }

const onSIChange = (event: any) => {
console.log("🚀 ~ file: create-and-list-nft.tsx:351 ~ onSIChange ~ event:", event)

}
  return (
    <div className="flex items-start justify-center main-h brand-bg mint-nft">
      <div className="flex flex-col  create-form border-rose-500 p-5 w-100">


        <div className="flex flex-col">
          <label htmlFor="description" className='text-xl font-bold text-white' >Description </label>
          <textarea
            placeholder="Asset Description" name="description"
            className="mb-5 border rounded p-4"
            onChange={e => updateFormInput({ ...formInput, description: e.target.value })}
          />
        </div>
        <label htmlFor="ai" className='text-xl font-bold text-white' >AI models for generate an image </label>
        <Select
          placeholder='Chose AI model text to image'
          primaryColor='blue'
          value={ai}
          onSearchInputChange={onSIChange}
          onChange={handleChange}
          options={options}
        />
        {<div className="flex flex-col">
          <label htmlFor="name-nft" className='text-xl font-bold text-white' >Name </label>
          <input
            ref={inputName}
            name="name-nft"
            placeholder="Asset Name"
            className="mb-5 border rounded p-4"
          //onChange={e => updateFormInput({ ...formInput, name: e.target.value })}
          />
        </div>}

        {<div className="flex flex-col">
          <label htmlFor="description" className='text-xl font-bold text-white' >Prompt of the image </label>
          <textarea
            ref={inputPrompt}
            placeholder="Paste the prompt here" name="prompt"
            className=" border rounded p-4"
            onChange={e => updateFormInput({ ...formInput, prompt: e.target.value })}
          />
        </div>}
        {formInput.prompt && !isPromptEncoded && <button onClick={encodePrompt} className="font-bold mint-btn rounded mt-2 p-4 shadow-lg " >
          Encode the prompt
        </button>}

        {isPromptEncoded && <div className="flex flex-col">
          <label htmlFor="price" className='text-xl font-bold text-white' >Price </label>
          <input
            name="price"
            type="number"
            placeholder="Asset Price in Eth"
            className="mb-5 border rounded p-4"
            onChange={e => updateFormInput({ ...formInput, price: e.target.value })}
          />
        </div>} 
        {encryptedPrompt && isGenImage && formInput.price && <Loader />}
        {!base64FileData && ai?.value && !isGenImage && formInput.price && encryptedPrompt && <button onClick={generateImage} className="font-bold mint-btn rounded mt-10 p-4 shadow-lg">
          Generate an image by AI model:
          {ai?.label}
        </button>}
        {
          generatedImage && <div className="poster">
            <div className="block mb-2 text-sm font-medium text-white dark:text-white">Generated Image</div>
            {getTemplateByTypeFile(generatedImage, typeFile)}
          </div>

        } 
        {isGenPrompt && <Loader processName={'Generating prompt from your description'}/>}

        {isUploadToIpfs && enableMint &&
          <Loader processName={"Minting the NFT"}/>

        }
        {base64FileData !== '' && !isUploadToIpfs && enableMint && !isProcessMint && <button onClick={listNFTForSale} className="font-bold mint-btn rounded mt-10 p-4 shadow-lg">
          Mint and list NFT
        </button>}
        {isProcessMint && enableMint && <button type="button" className="font-bold mint-btn text-white rounded mt-10 p-4 shadow-lg" disabled>{isUploadToIpfs ? 'Uploading the info to IPFS' : 'Processing in Metamask...'}</button>}

      </div>
    </div>
  )
}

