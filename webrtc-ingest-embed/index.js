// JS is only needed in this example to let the user set the stream key

const streamKeyForm = document.querySelector("#streamkey-form")
const streamKeyInput = document.querySelector("#streamkey-input")
const embed = document.querySelector("#embed")

streamKeyForm.onsubmit = (e) => {
  e.preventDefault()
  const streamKey = streamKeyInput.value

  if (streamKey !== "") {
    const url = new URL(embed.src)
    const params = url.searchParams
    params.set("core.streamKey", streamKey)
    url.search = params
    embed.src = url.toString()
  }
}