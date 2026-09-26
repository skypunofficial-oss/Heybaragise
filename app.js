// Heybaragise app.js v69 — based on v68
// ============================
// 1) ใส่ค่าจาก Supabase Project Settings > API
// ============================
const SUPABASE_URL = "https://amrdtfwlmkkgtsozhupi.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_oLIc9gwzec-BwJgSwhJncw_8yucB6Wu";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

const state = { products: [], promotions: [], combos: [], selectedProduct: null, isAdmin: false };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
$("#year").textContent = new Date().getFullYear();

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function mixedText(v=""){
  const s = escapeHtml(v);
  return s.replace(/[A-Za-z0-9][A-Za-z0-9 .&+/'’_-]*[A-Za-z0-9]|[가-힣ㄱ-ㅎㅏ-ㅣ]+/g, m => `<span class="font-en">${m}</span>`);
}
function richText(v=""){
  return String(v ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => mixedText(line))
    .join("<br>");
}
function money(v){ return Number(v||0).toLocaleString("th-TH",{maximumFractionDigits:2}); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
function showView(id){ $$(".view").forEach(x=>x.classList.remove("active")); $("#"+id+"View").classList.add("active"); window.scrollTo({top:0,behavior:"smooth"}); }
function openDialog(id){ $("#"+id).showModal(); }
function closeDialog(id){ $("#"+id).close(); }

async function loadAll(){
  const [p,pr,c] = await Promise.all([
    sb.from("products").select("*, packages(*)").eq("active",true).order("sort_order"),
    sb.from("promotions").select("*, products(name,icon)").eq("active",true).order("created_at",{ascending:false}),
    sb.from("combos").select("*, combo_items(product_id, package_id)").eq("active",true).order("created_at",{ascending:false})
  ]);
  if(p.error) console.error(p.error);
  if(pr.error) console.error(pr.error);
  if(c.error) console.error(c.error);
  state.products=p.data||[];
  state.promotions=pr.data||[];
  state.combos=(c.data||[]).map(enrichCombo);
  renderProducts(); renderPromotions(); renderHomeCombos();
}

function enrichCombo(combo){
  const items=(combo.combo_items||[]).map(item=>{
    const product=state.products.find(p=>String(p.id)===String(item.product_id));
    const pkg=(product?.packages||[]).find(x=>String(x.id)===String(item.package_id));
    return {...item, products:product||null, packages:pkg||null};
  });
  return {...combo, combo_items:items};
}


function renderProducts(list=state.products){
  $("#productGrid").innerHTML = list.length ? list.map(p=>`
    <article class="product-card glass" data-id="${p.id}">
      ${p.image_url?`<img class="product-image" src="${p.image_url}" alt="${escapeHtml(p.name)}">`:""}
      <div class="card-body">
        <div class="product-icon">${escapeHtml(p.icon||"📱")}</div>
        <h3>${mixedText(p.name)}</h3>
        <p>${richText(p.short_description||"")}</p>
        <span class="arrow">→</span>
      </div>
    </article>`).join("") : `<div class="empty">ยังไม่มีสินค้า</div>`;
  $$("#productGrid .product-card").forEach(card=>card.onclick=()=>openProduct(card.dataset.id));
}
function renderHomeCombos(){
  const el = $("#homeComboGrid");
  if (!el) return;

  const combos = state.combos || [];

  el.innerHTML = combos.length
    ? combos.map(c => `
      <article class="combo-card promo-card glass" data-combo-id="${c.id}">
        <div class="combo-image-row">
          ${(c.combo_items || []).slice(0,2).map(i =>
            i.products?.image_url
              ? `<img class="combo-product-image" src="${i.products.image_url}" alt="">`
              : `<div class="combo-product-placeholder">${escapeHtml(i.products?.icon || "📱")}</div>`
          ).join("")}
        </div>

        <div class="card-body">
          <span class="badge">🤝 Combo Deal</span>
          <h3>${mixedText(c.name)}</h3>
          <p>${richText(c.description || "")}</p>
          <div class="price-sale">฿${money(c.sale_price)}</div>
        </div>
      </article>
    `).join("")
    : `<div class="empty">ยังไม่มี Combo พิเศษ</div>`;

  $$("#homeComboGrid .combo-card").forEach(card => {
    card.onclick = () => openCombo(card.dataset.comboId);
  });
}

function renderPromotions(){
  const promos = state.promotions.map(p=>`
    <article class="promo-card glass">
      ${p.image_url?`<img class="promo-image" src="${p.image_url}" alt="">`:``}
      <div class="card-body"><span class="badge">${escapeHtml(p.products?.icon||"🎁")} ${escapeHtml(p.products?.name||"โปรโมชั่น")}</span>
      <h3>${mixedText(p.title)}</h3><p>${richText(p.description||"")}</p>
      ${p.external_url?`<a class="external-link" href="${p.external_url}" target="_blank" rel="noopener">ดูเพิ่มเติม ↗</a>`:""}</div>
    </article>`).join("");

  const combos = state.combos.map(c=>`
    <article class="combo-card promo-card glass" data-combo-id="${c.id}">
      <div class="combo-image-row">
        ${(c.combo_items||[]).slice(0,2).map(i=>i.products?.image_url
          ? `<img class="combo-product-image" src="${i.products.image_url}" alt="${escapeHtml(i.products?.name||"")}">`
          : `<div class="combo-product-placeholder">${escapeHtml(i.products?.icon||"📱")}</div>`
        ).join("")}
      </div>
      <div class="card-body">
        <span class="badge">🤝 Combo Deal</span>
        <h3>${mixedText(c.name)}</h3>
        <p>${richText(c.description||"")}</p>
        <p class="combo-package-summary">${(c.combo_items||[]).map(i=>`${escapeHtml(i.products?.icon||"📱")} ${mixedText(i.products?.name||"")} · ${mixedText(i.packages?.name||"แพ็กเกจ")}`).join(" + ")}</p>
        ${c.original_price?`<span class="price-old">฿${money(c.original_price)}</span>`:""}
        <div class="price-sale">฿${money(c.sale_price)}</div>
      </div>
    </article>`).join("");

  $("#promotionGrid").innerHTML = (promos+combos)||`<div class="empty">ยังไม่มีโปรโมชั่น</div>`;
  $$("#promotionGrid .combo-card").forEach(card=>card.onclick=()=>openCombo(card.dataset.comboId));
}
function openCombo(id){
  const c=state.combos.find(x=>String(x.id)===String(id)); if(!c)return;
  const items=(c.combo_items||[]).slice(0,2);
  const images=items.map(i=>i.products?.image_url
    ? `<img class="combo-detail-product-image" src="${i.products.image_url}" alt="${escapeHtml(i.products?.name||"")}">`
    : `<div class="combo-detail-product-placeholder">${escapeHtml(i.products?.icon||"📱")}</div>`
  ).join("");

  const details=items.map(i=>`
    <section class="info-card glass combo-product-detail">
      <div class="combo-detail-heading">
        ${i.products?.image_url?`<img class="combo-detail-small-image" src="${i.products.image_url}" alt="">`:`<span class="combo-detail-icon">${escapeHtml(i.products?.icon||"📱")}</span>`}
        <div>
          <span class="badge">${mixedText(i.products?.name||"สินค้า")}</span>
          <h2>${mixedText(i.products?.name||"สินค้า")}</h2>
        </div>
      </div>
      <p class="detail-description">${richText(i.products?.description||i.products?.short_description||"")}</p>
      <div class="package combo-selected-package">
        <span>${mixedText(i.packages?.name||"แพ็กเกจที่เลือก")}</span>
        <b>฿${money(i.packages?.price)}</b>
      </div>
    </section>`).join("");

  $("#comboDetail").innerHTML=`
    <div class="detail-hero glass combo-detail-hero">
      <div class="combo-detail-image-row">${images}</div>
      <span class="badge">🤝 Combo Deal</span>
      <h1>${mixedText(c.name)}</h1>
      <p class="detail-description">${escapeHtml(c.description||"")}</p>
      <div class="combo-detail-price">
        ${c.original_price?`<span class="price-old">฿${money(c.original_price)}</span>`:""}
        <strong>฿${money(c.sale_price)}</strong>
      </div>
      ${c.external_url?`<p style="margin-top:18px"><a class="external-link" href="${c.external_url}" target="_blank" rel="noopener">รับ Combo / สั่งซื้อ ↗</a></p>`:""}
    </div>
    <div class="detail-grid combo-detail-grid">${details}</div>`;
  showView("comboDetail");
}

function openProduct(id){
  const p=state.products.find(x=>x.id===id); if(!p)return;
  state.selectedProduct=p;
  const packages=(p.packages||[]).map(x=>`<div class="package"><span>${mixedText(x.name)}</span><b>฿${money(x.price)}</b></div>`).join("")||"<p>สอบถามราคาเพิ่มเติมได้</p>";
  const related=state.promotions.filter(x=>x.product_id===p.id);
  $("#productDetail").innerHTML=`
    <div class="detail-hero glass"><div class="detail-top">
      ${p.image_url?`<img class="detail-image" src="${p.image_url}" alt="">`:`<div class="detail-icon">${escapeHtml(p.icon||"📱")}</div>`}
      <div><span class="badge">Premium App</span><h1>${mixedText(p.name)}</h1><p>${richText(p.description||p.short_description||"")}</p></div>
    </div></div>
    <div class="detail-grid">
      <section class="info-card glass"><h2>💳 ราคาแพ็กเกจ</h2>${packages}</section>
      <section class="info-card glass"><h2>🎁 โปรโมชั่น</h2>${related.length?related.map(x=>`<div class="package">${mixedText(x.title)}</div>`).join(""):"<p>ยังไม่มีโปรโมชั่น</p>"}</section>
      <section class="info-card glass"><h2>🎬 น่าดู / แนะนำ</h2><p>Admin สามารถใช้ “โปรโมชั่น” เพิ่ม Poster ซีรีส์ หนัง หรือคอนเทนต์น่าดูของแต่ละแอปได้ พร้อมรูปและลิงก์ภายนอก</p></section>
    </div>
    ${p.external_url?`<p style="margin-top:18px"><a class="external-link" href="${p.external_url}" target="_blank" rel="noopener">ไปยังลิงก์ภายนอก / สั่งซื้อ ↗</a></p>`:""}`;
  showView("detail");
}
const searchInput = $("#search");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    const q = e.target.value.toLowerCase();

    renderProducts(
      state.products.filter(p =>
        `${p.name} ${p.short_description} ${p.description}`
          .toLowerCase()
          .includes(q)
      )
    );
  });
}


$$("[data-view]").forEach(b =>
  b.addEventListener("click", () =>
    showView(b.dataset.view)
  )
);


$$(".close").forEach(b =>
  b.addEventListener("click", () =>
    closeDialog(b.dataset.close)
  )
);


let brandClicks = 0;
let brandTimer;


const brandButton = $("#brand");

if (brandButton) {

  brandButton.addEventListener("click", async () => {

    brandClicks++;

    clearTimeout(brandTimer);

    brandTimer = setTimeout(
      () => brandClicks = 0,
      1800
    );


    if (brandClicks >= 5) {

      brandClicks = 0;

      const {
        data: { session }
      } = await sb.auth.getSession();


      if (session) {

        await enterAdmin();

      } else {

        openDialog("authDialog");

      }

    }

  });

}


const loginForm = $("#loginForm");

if (loginForm) {

  loginForm.addEventListener("submit", async e => {

    e.preventDefault();

    const { error } =
      await sb.auth.signInWithPassword({

        email:
          $("#loginEmail").value,

        password:
          $("#loginPassword").value

      });


    if (error) {

      return toast(error.message);

    }


    closeDialog("authDialog");

    await enterAdmin();

  });

}
$("#logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut();state.isAdmin=false;showView("home");toast("ออกจากระบบแล้ว");});

async function enterAdmin(){
  const {data:{session}}=await sb.auth.getSession(); if(!session)return;
  const {data,error}=await sb.from("admin_users").select("user_id").eq("user_id",session.user.id).maybeSingle();
  if(error||!data){await sb.auth.signOut();return toast("บัญชีนี้ไม่มีสิทธิ์ Admin");}
  state.isAdmin=true; await loadAdminData(); showView("admin");
}

$$(".tab").forEach(t=>t.addEventListener("click",()=>{
  $$(".tab").forEach(x=>x.classList.remove("active")); t.classList.add("active");
  $$(".admin-panel").forEach(x=>x.classList.remove("active")); $("#admin"+t.dataset.adminTab[0].toUpperCase()+t.dataset.adminTab.slice(1)).classList.add("active");
}));

async function loadAdminData(){
  const [p,pr,c]=await Promise.all([
    sb.from("products").select("*, packages(*)").order("sort_order"),
    sb.from("promotions").select("*").order("created_at",{ascending:false}),
    sb.from("combos").select("*, combo_items(product_id, package_id)").order("created_at",{ascending:false})
  ]);
  state.adminProducts=p.data||[];
  state.adminPromotions=pr.data||[];
  state.adminCombos=(c.data||[]).map(enrichCombo);
  renderAdmin();
}

function renderAdmin(){
  $("#adminProductList").innerHTML=state.adminProducts.map(p=>adminRow(`${p.icon||"📱"} ${p.name}`,p.active,`editProduct('${p.id}')`,`deleteProduct('${p.id}')`)).join("")||"<div class='empty'>ไม่มีสินค้า</div>";
  $("#adminPromoList").innerHTML=state.adminPromotions.map(p=>adminRow(`🎁 ${p.title}`,p.active,`editPromo('${p.id}')`,`deletePromo('${p.id}')`)).join("")||"<div class='empty'>ไม่มีโปรโมชั่น</div>";
  $("#adminComboList").innerHTML=state.adminCombos.map(c=>adminRow(`🤝 ${c.name} — ฿${money(c.sale_price)}`,c.active,`editCombo('${c.id}')`,`deleteCombo('${c.id}')`)).join("")||"<div class='empty'>ไม่มี Combo</div>";
}
function adminRow(title,active,edit,del){return `<div class="admin-row glass"><div><b>${escapeHtml(title)}</b><p>${active?"🟢 แสดง":"⚪ ซ่อน"}</p></div><div class="admin-actions"><button class="small" onclick="${edit}">✏️ แก้ไข</button><button class="small danger" onclick="${del}">🗑 ลบ</button></div></div>`;}

async function uploadImage(file,folder="images"){
  if(!file)return null;
  const ext=file.name.split(".").pop(); const path=`${folder}/${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from("media").upload(path,file,{upsert:false});
  if(error)throw error;
  return sb.storage.from("media").getPublicUrl(path).data.publicUrl;
}

// PRODUCT
$("#addProductBtn").onclick=()=>{resetProductForm();openDialog("productDialog");};
function packageRow(data={name:"",price:""}){const d=document.createElement("div");d.className="package-row";d.innerHTML=`<input class="pkg-name" placeholder="ชื่อแพ็กเกจ" value="${escapeHtml(data.name)}"><input class="pkg-price" type="number" min="0" placeholder="ราคา" value="${data.price??""}"><button type="button" class="small danger">×</button>`;d.querySelector("button").onclick=()=>d.remove();$("#packageRows").appendChild(d);}
$("#addPackageRow").onclick=()=>packageRow();
function resetProductForm(){ $("#productForm").reset();$("#productId").value="";$("#packageRows").innerHTML="";packageRow();$("#productFormTitle").textContent="เพิ่มสินค้า"; }
window.editProduct=id=>{
  const p=state.adminProducts.find(x=>x.id===id);resetProductForm();$("#productId").value=p.id;$("#pName").value=p.name;$("#pIcon").value=p.icon||"";$("#pShort").value=p.short_description||"";$("#pDescription").value=p.description||"";$("#pLink").value=p.external_url||"";$("#pActive").checked=p.active;$("#packageRows").innerHTML="";(p.packages||[]).forEach(packageRow);$("#productFormTitle").textContent="แก้ไขสินค้า";openDialog("productDialog");
};
$("#productForm").addEventListener("submit",async e=>{
  e.preventDefault(); try{
    const id=$("#productId").value; let imageUrl=null; const file=$("#pImage").files[0]; if(file) imageUrl=await uploadImage(file,"products");
    const payload={name:$("#pName").value,icon:$("#pIcon").value,short_description:$("#pShort").value,description:$("#pDescription").value,external_url:$("#pLink").value||null,active:$("#pActive").checked};
    if(imageUrl)payload.image_url=imageUrl;
    let productId=id;
    if(id){const {error}=await sb.from("products").update(payload).eq("id",id);if(error)throw error;await sb.from("packages").delete().eq("product_id",id);}
    else {const {data,error}=await sb.from("products").insert(payload).select().single();if(error)throw error;productId=data.id;}
    const pkgs=$$(".package-row").map(r=>({product_id:productId,name:r.querySelector(".pkg-name").value,price:Number(r.querySelector(".pkg-price").value||0)})).filter(x=>x.name);
    if(pkgs.length){const {error}=await sb.from("packages").insert(pkgs);if(error)throw error;}
    closeDialog("productDialog");await loadAll();await loadAdminData();toast("บันทึกสินค้าแล้ว");
  }catch(err){toast(err.message);}
});
window.deleteProduct=async id=>{if(!confirm("ลบสินค้านี้?"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();};

// PROMOTION / poster / external link
$("#addPromoBtn").onclick=()=>{resetPromoForm();openDialog("promoDialog");};
function fillProductSelects(){
  const opts=state.adminProducts.map(p=>`<option value="${p.id}">${escapeHtml(p.icon||"📱")} ${escapeHtml(p.name)}</option>`).join("");
  $("#promoProduct").innerHTML=opts;
  populateComboProductSelectors();
}
function resetPromoForm(){ $("#promoForm").reset();$("#promoId").value="";fillProductSelects();$("#promoFormTitle").textContent="เพิ่มโปรโมชั่น"; }

function comboProductOptions(selected=""){
  return `<option value="">เลือกสินค้า</option>`+state.adminProducts.map(p=>`<option value="${p.id}" ${String(selected)===String(p.id)?"selected":""}>${escapeHtml(p.icon||"📱")} ${escapeHtml(p.name)}</option>`).join("");
}
function comboPackageOptions(productId, selected=""){
  const p=state.adminProducts.find(x=>String(x.id)===String(productId));
  return `<option value="">เลือกแพ็กเกจ</option>`+(p?.packages||[]).map(x=>`<option value="${x.id}" ${String(selected)===String(x.id)?"selected":""}>${escapeHtml(x.name)} — ฿${money(x.price)}</option>`).join("");
}
function populateComboProductSelectors(values=[{},{}]){
  ["1","2"].forEach((n,i)=>{
    const row=$(`#comboItem${n}`);
    if(!row)return;
    const item=values[i]||{};
    $(`#comboProduct${n}`).innerHTML=comboProductOptions(item.product_id);
    $(`#comboPackage${n}`).innerHTML=comboPackageOptions(item.product_id,item.package_id);
  });
}

window.editPromo=id=>{const p=state.adminPromotions.find(x=>x.id===id);resetPromoForm();$("#promoId").value=p.id;$("#promoProduct").value=p.product_id||"";$("#promoTitle").value=p.title;$("#promoDescription").value=p.description||"";$("#promoLink").value=p.external_url||"";$("#promoActive").checked=p.active;$("#promoFormTitle").textContent="แก้ไขโปรโมชั่น";openDialog("promoDialog");};
$("#promoForm").addEventListener("submit",async e=>{e.preventDefault();try{
  const id=$("#promoId").value;let imageUrl=null;const file=$("#promoImage").files[0];if(file)imageUrl=await uploadImage(file,"posters");
  const payload={product_id:$("#promoProduct").value||null,title:$("#promoTitle").value,description:$("#promoDescription").value,external_url:$("#promoLink").value||null,active:$("#promoActive").checked};if(imageUrl)payload.image_url=imageUrl;
  const q=id?sb.from("promotions").update(payload).eq("id",id):sb.from("promotions").insert(payload);const {error}=await q;if(error)throw error;
  closeDialog("promoDialog");await loadAll();await loadAdminData();toast("บันทึกโปรโมชั่นแล้ว");
}catch(err){toast(err.message);}});
window.deletePromo=async id=>{if(!confirm("ลบโปรโมชั่น?"))return;const {error}=await sb.from("promotions").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();};

// COMBO — exactly 2 products, one selected package per product
$("#addComboBtn").onclick=()=>{resetComboForm();openDialog("comboDialog");};
function resetComboForm(){
  $("#comboForm").reset();
  $("#comboId").value="";
  fillProductSelects();
  populateComboProductSelectors([{},{}]);
  $("#comboFormTitle").textContent="สร้าง Combo ลดราคา";
}
window.editCombo=id=>{
  const c=state.adminCombos.find(x=>String(x.id)===String(id)); if(!c)return;
  resetComboForm();
  $("#comboId").value=c.id;
  $("#comboName").value=c.name||"";
  $("#comboDescription").value=c.description||"";
  $("#comboOriginalPrice").value=c.original_price??"";
  $("#comboSalePrice").value=c.sale_price??"";
  $("#comboLink").value=c.external_url||"";
  $("#comboActive").checked=c.active;
  const items=(c.combo_items||[]).slice(0,2);
  populateComboProductSelectors([items[0]||{},items[1]||{}]);
  $("#comboFormTitle").textContent="แก้ไข Combo";
  openDialog("comboDialog");
};

["1","2"].forEach(n=>{
  $(`#comboProduct${n}`).addEventListener("change",()=>{
    $(`#comboPackage${n}`).innerHTML=comboPackageOptions($(`#comboProduct${n}`).value,"");
  });
});

$("#comboForm").addEventListener("submit",async e=>{
  e.preventDefault();
  try{
    const id=$("#comboId").value;
    const selected=[
      {product_id:$("#comboProduct1").value,package_id:$("#comboPackage1").value},
      {product_id:$("#comboProduct2").value,package_id:$("#comboPackage2").value}
    ];
    if(selected.some(x=>!x.product_id||!x.package_id)) throw new Error("กรุณาเลือกสินค้าและแพ็กเกจให้ครบทั้ง 2 รายการ");
    if(selected[0].product_id===selected[1].product_id) throw new Error("Combo ต้องเลือกสินค้าคนละรายการ");

    const payload={
      name:$("#comboName").value.trim(),
      description:$("#comboDescription").value,
      original_price:Number($("#comboOriginalPrice").value||0),
      sale_price:Number($("#comboSalePrice").value||0),
      external_url:$("#comboLink").value||null,
      active:$("#comboActive").checked
    };
    if(!payload.name) throw new Error("กรุณาใส่ชื่อ Combo");

    let comboId=id;
    if(id){
      const r=await sb.from("combos").update(payload).eq("id",id);
      if(r.error)throw r.error;
      const d=await sb.from("combo_items").delete().eq("combo_id",id);
      if(d.error)throw d.error;
    }else{
      const r=await sb.from("combos").insert(payload).select().single();
      if(r.error)throw r.error;
      comboId=r.data.id;
    }

    const {error}=await sb.from("combo_items").insert(
      selected.map(x=>({combo_id:comboId,product_id:x.product_id,package_id:x.package_id}))
    );
    if(error)throw error;

    closeDialog("comboDialog");
    await loadAll();
    await loadAdminData();
    toast("บันทึก Combo แล้ว");
  }catch(err){
    console.error("Combo save error:",err);
    toast("บันทึก Combo ไม่สำเร็จ: "+(err?.message||"ไม่ทราบสาเหตุ"));
  }
});
window.deleteCombo=async id=>{if(!confirm("ลบ Combo?"))return;const {error}=await sb.from("combos").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();};

loadAll();
loadSocialLinks();

async function loadSocialLinks() {

  const { data, error } = await sb
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", {
      ascending: true
    });

  if (error) {
    console.error("Social links error:", error);
    return;
  }

  renderSocialLinks(data || []);
}


function renderSocialLinks(items) {

  const container = $("#socialLinks");

  if (!container) return;


  container.innerHTML = items.map(item => `

    <a
      href="${item.external_url}"
      target="_blank"
      rel="noopener noreferrer"
      class="social-link"
      aria-label="${item.name}"
    >

      <img
        src="${item.icon_url}"
        alt="${item.name}"
      >

    </a>

  `).join("");

}
