import os
import replicate

def generate_ai_image(prompt: str, style: str):

   import os
import replicate

client = replicate.Client(
    api_token=os.getenv("REPLICATE_API_TOKEN")
)

    full_prompt = f"{prompt}, {style} style"

    output = client.run(
        "stability-ai/stable-diffusion",
        input={
            "prompt": full_prompt,
            "width": 768,
            "height": 768
        }
    )

    return output[0]