export interface CharacterImageInput {
  age: number
  job: string
  face: number
  height: number
  body: number
  fashion: number
  intro: string
}

function buildPrompt(c: CharacterImageInput): string {
  const ageLabel = c.age < 30 ? 'mid-20s' : c.age < 40 ? 'early 30s' : 'early 40s'
  const faceDesc = c.face >= 80 ? 'very handsome face' : c.face >= 60 ? 'handsome face' : 'average face'
  const heightDesc = c.height >= 80 ? 'very tall' : c.height >= 60 ? 'tall' : 'average height'
  const bodyDesc = c.body >= 80 ? 'muscular athletic build' : c.body >= 60 ? 'fit body' : 'average build'
  const fashionDesc = c.fashion >= 80 ? 'very stylish premium fashion' : c.fashion >= 60 ? 'stylish casual outfit' : 'neat casual clothes'

  return (
    `Korean adult male, ${ageLabel}, works as ${c.job}, ` +
    `${faceDesc}, ${heightDesc}, ${bodyDesc}, wearing ${fashionDesc}, ` +
    `confident expression, upper body portrait, ` +
    `digital illustration, concept art style, painterly, ` +
    `soft lighting, detailed brushwork, warm color palette, artstation quality`
  )
}

// 나중에 Vast.ai SD로 교체할 때 이 함수만 바꾸면 됨
export async function generateCharacterImage(input: CharacterImageInput): Promise<string> {
  const prompt = buildPrompt(input)
  const encoded = encodeURIComponent(prompt)
  const seed = Math.floor(Math.random() * 999999)

  const url = `https://image.pollinations.ai/prompt/${encoded}?width=400&height=520&seed=${seed}&nologo=true&model=flux`

  // URL이 유효한지 확인 (이미지 로드 테스트)
  await new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('이미지 로드 실패'))
    img.src = url
  })

  return url
}
