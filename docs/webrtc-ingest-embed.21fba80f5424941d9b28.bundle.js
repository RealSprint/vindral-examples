(()=>{const e=document.querySelector("#streamkey-form"),t=document.querySelector("#streamkey-input"),r=document.querySelector("#embed");e.onsubmit=e=>{e.preventDefault();const c=t.value;if(""!==c){const e=new URL(r.src),t=e.searchParams;t.set("core.streamKey",c),e.search=t,r.src=e.toString()}}})();