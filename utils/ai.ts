import axios from 'axios';

import { GptResponse } from "../interfaces/types";
import { env } from "../next.config";

const OApi = env.OPENAI_API_KEY; 

export function getImageByPrompt() {

}

export async function getPromptByDescription(text: string, modelName: string): Promise<GptResponse | undefined> {
    try {
        const DEFAULT_PARAMS = {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: `Now You are a helpful assistant who answered as prompt engineer for text-to-image model ${modelName} and  responds as  JSON look like as the object {titlePrompt: "It must be 3-7 words to describe the prompt" , prompt: "full prompt for the model text-to-image"}  . The prompt need to generate from user input text below` },
                { role: "user", content: text }
            ],
            // max_tokens: 4096,
            temperature: 0,
            // frequency_penalty: 1.0,
            // stream: true,
        };

        const params_ = { ...DEFAULT_PARAMS };
        const result = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + String(OApi)
            },
            body: JSON.stringify(params_)
        });
        const stream = result.body
        const output = await fetchStream(stream);
        return JSON.parse(output.choices[0].message.content)
    } catch (err) {
        console.error(
            "As an AI robot, I errored out."
        );
    }
}

const fetchStream = async (stream: any) => {
    const reader = stream.getReader();
    let charsReceived = 0;
    const li = document.createElement("li"); 
    const result = await reader.read().then(
        function processText({ done, value }: { done: any, value: string }) {
            if (done) {
                console.log("Stream complete");
                return li.innerText;
            }
            // value for fetch streams is a Uint8Array
            charsReceived += value.length;
            const chunk = value;
            // console.log(`Received ${charsReceived} characters so far. Current chunk = ${chunk}`);
            li.appendChild(document.createTextNode(chunk));
            return reader.read().then(processText);
        });
    const list = result.split(",")
    const numList = list.map((item: string) => {
        return parseInt(item)
    })
    const text = String.fromCharCode(...numList);
    const response = JSON.parse(text)
    return response
}

export async function generateImageByPrompt(apiUrl: string, prompt: string): Promise<string | undefined> {
    try {
        const response = await axios({
            url: apiUrl,
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.HUGGING_FACE_TOKEN}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                inputs: prompt,
                options: {
                    wait_for_model: true
                }
            }),
            responseType: 'arraybuffer'
        })
        const type = response.headers['content-type'];
        console.log("🚀 ~ file: create-and-list-nft.tsx:257 ~ generateImage ~ type:", type)
        const data = response.data;
        const b64Data = Buffer.from(data).toString('base64');
        return `data:${type};base64,${b64Data}`; 
    } catch (err) {
        console.error('err', err)
    } finally {
    }

}