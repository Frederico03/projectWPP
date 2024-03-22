import axios, { AxiosResponse } from 'axios';

export async function postToApi(imageData: string): Promise<void> {
  try {
    //essa URL é a api da automatic 1111 sendo consumida, no exemplo, localmente 
    const apiUrl = 'http://127.0.0.1:7860/sdapi/v1/txt2img';
    const postData = {
      "prompt": imageData,
      "negative_prompt": "",
      "styles": [
        "Style: Watercolor"
      ],
      "seed": -1,
      "steps": 10,
      "width": 1024,
      "height": 1024,
    };

    const response: AxiosResponse<any> = await axios.post(apiUrl, postData, {
      responseType: 'arraybuffer', // Define o tipo de resposta como arraybuffer
    });

    if (response.status === 200) {
      console.log(response)
      // Se a solicitação for bem-sucedida, você pode processar a resposta aqui
      const base64Data: string = Buffer.from(response.data, 'binary').toString('base64');
      console.log('Resposta em base64:', base64Data);
    } else {
      console.error('Erro na solicitação:', response.status);
    }
  } catch (error) {
    console.error('Erro ao fazer a solicitação:', error);
  }
}