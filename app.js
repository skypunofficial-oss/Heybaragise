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

const state = {
  products: [],
  promotions: [],
  combos: [],
  socialLinks: [],
  siteSettings: null,
  selectedProduct: null,
  isAdmin: false,
  adminProducts: [],
  adminPromotions: [],
  adminCombos: [],
  adminSocialLinks: []
};
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
$("#year").textContent = new Date().getFullYear();

function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(v){ return Number(v||0).toLocaleString("th-TH",{maximumFractionDigits:2}); }
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
function showView(id){ $$(".view").forEach(x=>x.classList.remove("active")); $("#"+id+"View").classList.add("active"); window.scrollTo({top:0,behavior:"smooth"}); }
function openDialog(id){ $("#"+id).showModal(); }
function closeDialog(id){ $("#"+id).close(); }

async function loadAll(){
  const [p,pr,c] = await Promise.all([
    sb.from("products").select("*, packages(*)").eq("active",true).order("sort_order"),
    sb.from("promotions").select("*, products(name,icon)").eq("active",true).order("created_at",{ascending:false}),
    sb.from("combos").select("*, combo_items(product_id, products(id,name,icon))").eq("active",true).order("created_at",{ascending:false})
  ]);
  if(p.error) console.error(p.error);
  state.products=p.data||[]; state.promotions=pr.data||[]; state.combos=c.data||[];
  renderProducts(); renderPromotions(); renderRecommendationsForHome();
}

function renderProducts(list=state.products){
  $("#productGrid").innerHTML = list.length ? list.map(p=>`
    <article class="product-card glass" data-id="${p.id}">
      ${p.image_url?`<img class="product-image" src="${p.image_url}" alt="${escapeHtml(p.name)}">`:""}
      <div class="card-body">
        <div class="product-icon">${escapeHtml(p.icon||"📱")}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.short_description||"")}</p>
        <span class="arrow">→</span>
      </div>
    </article>`).join("") : `<div class="empty">ยังไม่มีสินค้า</div>`;
  $$("#productGrid .product-card").forEach(card=>card.onclick=()=>openProduct(card.dataset.id));
}

function renderPromotions(){
  const promos = state.promotions
    .filter(p => p.category !== "recommended")
    .map(p=>`
    <article class="promo-card glass">
      ${p.image_url?`<img class="promo-image" src="${p.image_url}" alt="${escapeHtml(p.title)}">`:""}
      <div class="card-body"><span class="badge">${escapeHtml(p.products?.icon||"🎁")} ${escapeHtml(p.products?.name||"โปรโมชั่น")}</span>
      <h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.description||"")}</p>
      ${p.external_url?`<a class="external-link" href="${p.external_url}" target="_blank" rel="noopener noreferrer">ดูเพิ่มเติม ↗</a>`:""}</div>
    </article>`).join("");

  const combos = state.combos.map(c=>`
    <article class="promo-card glass">
      <div class="card-body"><span class="badge">🤝 Combo Deal</span><h3>${escapeHtml(c.name)}</h3>
      <p>${escapeHtml(c.description||"")}</p>
      <p>${(c.combo_items||[]).map(i=>`${escapeHtml(i.products?.icon||"📱")} ${escapeHtml(i.products?.name||"")}`).join(" + ")}</p>
      ${c.original_price?`<span class="price-old">฿${money(c.original_price)}</span>`:""}
      <div class="price-sale">฿${money(c.sale_price)}</div>
      ${c.external_url?`<a class="external-link" href="${c.external_url}" target="_blank" rel="noopener noreferrer">รับโปรโมชั่น ↗</a>`:""}</div>
    </article>`).join("");

  $("#promotionGrid").innerHTML = (promos+combos)||`<div class="empty">ยังไม่มีโปรโมชั่น</div>`;
}

function renderRecommendationsForHome(){
  const home=$("#homeView");
  if(!home) return;

  let section=$("#recommendationHomeSection");
  if(!section){
    section=document.createElement("section");
    section.id="recommendationHomeSection";
    section.className="recommendation-section";
    section.innerHTML=`
      <div class="section-head">
        <div>
          <span class="section-label">WHAT TO WATCH</span>
          <h2>🎬 น่าดู / แนะนำ</h2>
        </div>
      </div>
      <div id="recommendationGrid" class="recommendation-grid"></div>
    `;
    home.appendChild(section);
  }

  const grid=$("#recommendationGrid");
  if(!grid) return;

  const items=state.promotions.filter(
    p=>p.category==="recommended"
  );

  grid.innerHTML=items.length
    ? items.map(item=>`
      <article class="recommendation-card glass">
        ${item.image_url
          ? `<img class="recommendation-image" src="${item.image_url}" alt="${escapeHtml(item.title)}">`
          : `<div class="recommendation-placeholder">🎬</div>`
        }
        <div class="recommendation-body">
          <span class="recommendation-badge">🎬 น่าดู</span>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.description||"")}</p>
          ${item.external_url?`<a href="${item.external_url}" target="_blank" rel="noopener noreferrer" class="recommendation-link">ดูเพิ่มเติม →</a>`:""}
        </div>
      </article>
    `).join("")
    : `<div class="empty">ยังไม่มีรายการแนะนำ</div>`;
}

function openProduct(id){
  const p=state.products.find(x=>x.id===id); if(!p)return;
  state.selectedProduct=p;
  const packages=(p.packages||[]).map(x=>`<div class="package"><span>${escapeHtml(x.name)}</span><b>฿${money(x.price)}</b></div>`).join("")||"<p>สอบถามราคาเพิ่มเติมได้</p>";
  const related=state.promotions.filter(x=>x.product_id===p.id);
  $("#productDetail").innerHTML=`
    <div class="detail-hero glass"><div class="detail-top">
      ${p.image_url?`<img class="detail-image" src="${p.image_url}" alt="">`:`<div class="detail-icon">${escapeHtml(p.icon||"📱")}</div>`}
      <div><span class="badge">Premium App</span><h1>${escapeHtml(p.name)}</h1><p>${escapeHtml(p.description||p.short_description||"")}</p></div>
    </div></div>
    <div class="detail-grid">
      <section class="info-card glass"><h2>💳 ราคาแพ็กเกจ</h2>${packages}</section>
      <section class="info-card glass"><h2>🎁 โปรโมชั่น</h2>${related.length?related.map(x=>`<div class="package">${escapeHtml(x.title)}</div>`).join(""):"<p>ยังไม่มีโปรโมชั่น</p>"}</section>
      <section class="info-card glass">
        <h2>🎬 น่าดู / แนะนำ</h2>
        <div class="recommendation-mini-grid">
        ${(state.promotions.filter(x=>x.product_id===p.id && x.category==="recommended").map(x=>`
          <article class="recommendation-mini">
            ${x.image_url?`<img src="${x.image_url}" alt="">`:`<div class="mini-placeholder">🎬</div>`}
            <div>
              <b>${escapeHtml(x.title)}</b>
              ${x.external_url?`<a href="${x.external_url}" target="_blank" rel="noopener noreferrer">ดูเพิ่มเติม →</a>`:""}
            </div>
          </article>
        `).join("") || "<p>ยังไม่มีรายการแนะนำ</p>")}
        </div>
      </section>
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
        `${p.name} ${p.short_description}`
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
$("#logoutBtn")?.addEventListener("click",async()=>{await sb.auth.signOut();state.isAdmin=false;showView("home");toast("ออกจากระบบแล้ว");});

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
  const [p,pr,c,s] = await Promise.all([
    sb.from("products").select("*, packages(*)").order("sort_order"),
    sb.from("promotions").select("*").order("created_at",{ascending:false}),
    sb.from("combos").select("*, combo_items(product_id)").order("created_at",{ascending:false}),
    sb.from("social_links").select("*").order("sort_order",{ascending:true})
  ]);

  if(p.error) console.error(p.error);
  if(pr.error) console.error(pr.error);
  if(c.error) console.error(c.error);
  if(s.error) console.error(s.error);

  state.adminProducts=p.data||[];
  state.adminPromotions=pr.data||[];
  state.adminCombos=c.data||[];
  state.adminSocialLinks=s.data||[];

  renderAdmin();
  renderAdminSocial();
  await loadAdminSettings();
}

function renderAdmin(){
  $("#adminProductList").innerHTML=state.adminProducts.map(p=>adminRow(`${p.icon||"📱"} ${p.name}`,p.active,`editProduct('${p.id}')`,`deleteProduct('${p.id}')`)).join("")||"<div class='empty'>ไม่มีสินค้า</div>";
  $("#adminPromoList").innerHTML=state.adminPromotions.map(p=>adminRow(`${p.category==="recommended"?"🎬":"🎁"} ${p.title}`,p.active,`editPromo('${p.id}')`,`deletePromo('${p.id}')`)).join("")||"<div class='empty'>ไม่มีรายการ</div>";
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
function fillProductSelects(){ const opts=state.adminProducts.map(p=>`<option value="${p.id}">${p.icon||"📱"} ${escapeHtml(p.name)}</option>`).join("");$("#promoProduct").innerHTML=opts;$("#comboProducts").innerHTML=opts; }
function resetPromoForm(){ $("#promoForm").reset();$("#promoId").value="";fillProductSelects();$("#promoCategory").value="promotion";$("#promoFormTitle").textContent="เพิ่มโปรโมชั่น / รายการแนะนำ"; }
window.editPromo=id=>{const p=state.adminPromotions.find(x=>x.id===id);if(!p)return;resetPromoForm();$("#promoId").value=p.id;$("#promoProduct").value=p.product_id||"";$("#promoCategory").value=p.category||"promotion";$("#promoTitle").value=p.title;$("#promoDescription").value=p.description||"";$("#promoLink").value=p.external_url||"";$("#promoActive").checked=p.active;$("#promoFormTitle").textContent=p.category==="recommended"?"แก้ไขรายการน่าดู / แนะนำ":"แก้ไขโปรโมชั่น";openDialog("promoDialog");};
$("#promoForm").addEventListener("submit",async e=>{e.preventDefault();try{
  const id=$("#promoId").value;let imageUrl=null;const file=$("#promoImage").files[0];if(file)imageUrl=await uploadImage(file,"posters");
  const payload={product_id:$("#promoProduct").value||null,category:$("#promoCategory").value,title:$("#promoTitle").value,description:$("#promoDescription").value,external_url:$("#promoLink").value||null,active:$("#promoActive").checked};if(imageUrl)payload.image_url=imageUrl;
  const q=id?sb.from("promotions").update(payload).eq("id",id):sb.from("promotions").insert(payload);const {error}=await q;if(error)throw error;
  closeDialog("promoDialog");await loadAll();await loadAdminData();toast("บันทึกโปรโมชั่นแล้ว");
}catch(err){toast(err.message);}});
window.deletePromo=async id=>{if(!confirm("ลบโปรโมชั่น?"))return;const {error}=await sb.from("promotions").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();};

// COMBO / collaboration between products
$("#addComboBtn").onclick=()=>{resetComboForm();openDialog("comboDialog");};
function resetComboForm(){ $("#comboForm").reset();$("#comboId").value="";fillProductSelects();$("#comboFormTitle").textContent="สร้าง Combo ลดราคา"; }
window.editCombo=id=>{const c=state.adminCombos.find(x=>x.id===id);resetComboForm();$("#comboId").value=c.id;$("#comboName").value=c.name;$("#comboDescription").value=c.description||"";$("#comboOriginalPrice").value=c.original_price||"";$("#comboSalePrice").value=c.sale_price||"";$("#comboLink").value=c.external_url||"";$("#comboActive").checked=c.active;(c.combo_items||[]).forEach(i=>{const o=[...$("#comboProducts").options].find(o=>o.value===i.product_id);if(o)o.selected=true;});$("#comboFormTitle").textContent="แก้ไข Combo";openDialog("comboDialog");};
$("#comboForm").addEventListener("submit",async e=>{e.preventDefault();try{
  const id=$("#comboId").value;const selected=[...$("#comboProducts").selectedOptions].map(o=>o.value);if(selected.length<2)throw new Error("เลือกสินค้าอย่างน้อย 2 รายการ");
  const payload={name:$("#comboName").value,description:$("#comboDescription").value,original_price:Number($("#comboOriginalPrice").value||0),sale_price:Number($("#comboSalePrice").value||0),external_url:$("#comboLink").value||null,active:$("#comboActive").checked};
  let comboId=id;
  if(id){let r=await sb.from("combos").update(payload).eq("id",id);if(r.error)throw r.error;await sb.from("combo_items").delete().eq("combo_id",id);}
  else{let r=await sb.from("combos").insert(payload).select().single();if(r.error)throw r.error;comboId=r.data.id;}
  const {error}=await sb.from("combo_items").insert(selected.map(product_id=>({combo_id:comboId,product_id})));if(error)throw error;
  closeDialog("comboDialog");await loadAll();await loadAdminData();toast("บันทึก Combo แล้ว");
}catch(err){toast(err.message);}});
window.deleteCombo=async id=>{if(!confirm("ลบ Combo?"))return;const {error}=await sb.from("combos").delete().eq("id",id);if(error)return toast(error.message);await loadAll();await loadAdminData();};

// ===========================================
// SOCIAL LINKS
// ===========================================

async function loadSocialLinks() {
  const { data, error } =
    await sb.from("social_links")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

  if (error) {
    console.error("Social links error:", error);
    return;
  }

  state.socialLinks = data || [];
  renderSocialLinks(state.socialLinks);
}

function socialFallbackIcon(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("instagram")) return "📸";
  if (n === "x" || n.includes("twitter")) return "𝕏";
  if (n.includes("line")) return "💚";
  if (n.includes("facebook")) return "f";
  if (n.includes("tiktok")) return "♪";
  return "🔗";
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
      aria-label="${escapeHtml(item.name)}"
    >
      ${item.icon_url
        ? `<img src="${item.icon_url}" alt="${escapeHtml(item.name)}">`
        : `<span class="social-fallback">${socialFallbackIcon(item.name)}</span>`
      }
    </a>
  `).join("");
}

// ===========================================
// ADMIN SOCIAL
// ===========================================

$("#addSocialBtn")?.addEventListener("click", () => {
  resetSocialForm();
  openDialog("socialDialog");
});

function resetSocialForm() {
  $("#socialForm")?.reset();
  $("#socialId").value = "";
  $("#socialOrder").value = state.adminSocialLinks.length;
  $("#socialActive").checked = true;
  $("#socialFormTitle").textContent = "เพิ่มช่องทางติดต่อ";
}

window.editSocial = id => {
  const s = state.adminSocialLinks.find(x => x.id === id);
  if (!s) return;

  resetSocialForm();
  $("#socialId").value = s.id;
  $("#socialName").value = s.name;
  $("#socialLink").value = s.external_url;
  $("#socialOrder").value = s.sort_order ?? 0;
  $("#socialActive").checked = s.is_active;
  $("#socialFormTitle").textContent = "แก้ไขช่องทางติดต่อ";
  openDialog("socialDialog");
};

function renderAdminSocial() {
  const container = $("#adminSocialList");
  if (!container) return;

  container.innerHTML =
    state.adminSocialLinks.map(s =>
      adminRow(
        `${socialFallbackIcon(s.name)} ${s.name}`,
        s.is_active,
        `editSocial('${s.id}')`,
        `deleteSocial('${s.id}')`
      )
    ).join("") ||
    "<div class='empty'>ยังไม่มีช่องทางติดต่อ</div>";
}

$("#socialForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  try {
    const id = $("#socialId").value;
    const file = $("#socialImage").files[0];
    let iconUrl = null;

    if (file) iconUrl = await uploadImage(file, "social");

    const payload = {
      name: $("#socialName").value.trim(),
      external_url: $("#socialLink").value.trim(),
      sort_order: Number($("#socialOrder").value || 0),
      is_active: $("#socialActive").checked
    };

    if (iconUrl) payload.icon_url = iconUrl;

    const result = id
      ? await sb.from("social_links").update(payload).eq("id", id)
      : await sb.from("social_links").insert(payload);

    if (result.error) throw result.error;

    closeDialog("socialDialog");
    await loadSocialLinks();
    await loadAdminData();
    toast("บันทึกช่องทางติดต่อแล้ว");
  } catch (err) {
    console.error(err);
    toast(err.message || "บันทึกช่องทางติดต่อไม่สำเร็จ");
  }
});

window.deleteSocial = async id => {
  if (!confirm("ลบช่องทางติดต่อนี้?")) return;

  const { error } =
    await sb.from("social_links").delete().eq("id", id);

  if (error) return toast(error.message);

  await loadSocialLinks();
  await loadAdminData();
};

// ===========================================
// SITE SETTINGS / BACKGROUND
// ===========================================

async function loadSiteSettings() {
  const { data, error } =
    await sb.from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

  if (error) {
    console.error("Site settings error:", error);
    applySiteTheme({});
    return;
  }

  state.siteSettings = data;
  applySiteTheme(data || {});
}

function applySiteTheme(settings = {}) {
  const accent = settings.accent_color || "#9ed8f5";
  const secondary = settings.secondary_color || "#f6b6d1";
  const bg = settings.background_image || null;

  document.documentElement.style.setProperty("--accent-color", accent);
  document.documentElement.style.setProperty("--secondary-color", secondary);

  if (bg) {
    document.body.classList.add("has-custom-background");
    document.body.style.backgroundImage = `url("${bg}")`;
  } else {
    document.body.classList.remove("has-custom-background");
    document.body.style.backgroundImage = "";
  }

  renderBackgroundPreview(bg);
}

function renderBackgroundPreview(url) {
  const box = $("#backgroundPreview");
  if (!box) return;

  box.innerHTML = url
    ? `<img src="${url}" alt="ภาพพื้นหลัง">`
    : `<span>ใช้ธีมเริ่มต้นฟ้า × ชมพู</span>`;
}

async function loadAdminSettings() {
  const { data, error } =
    await sb.from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

  if (error) {
    console.error("Admin settings error:", error);
    return;
  }

  state.siteSettings = data;

  $("#accentColor").value =
    data?.accent_color || "#9ed8f5";

  $("#secondaryColor").value =
    data?.secondary_color || "#f6b6d1";

  renderBackgroundPreview(
    data?.background_image || null
  );
}

async function extractThemeColors(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", {
          willReadFrequently: true
        });

        canvas.width = 64;
        canvas.height = 64;
        ctx.drawImage(img, 0, 0, 64, 64);

        const pixels =
          ctx.getImageData(0, 0, 64, 64).data;

        const samples = [];

        for (let i = 0; i < pixels.length; i += 4) {
          const r = pixels[i];
          const g = pixels[i + 1];
          const b = pixels[i + 2];

          const max = Math.max(r,g,b);
          const min = Math.min(r,g,b);
          const l = (max + min) / 510;

          if (max - min < 25 || l < .12 || l > .92)
            continue;

          samples.push({ r, g, b, score: max - min });
        }

        samples.sort((a,b) => b.score - a.score);

        const a = samples[0] || {
          r:158,g:216,b:245
        };

        const b = samples.find(x =>
          Math.abs(x.r - a.r) +
          Math.abs(x.g - a.g) +
          Math.abs(x.b - a.b) > 55
        ) || {
          r:246,g:182,b:209
        };

        const pastel = x => {
          const mix = 0.55;
          const r = Math.round(x.r * mix + 255 * (1-mix));
          const g = Math.round(x.g * mix + 255 * (1-mix));
          const bl = Math.round(x.b * mix + 255 * (1-mix));

          return "#" +
            [r,g,bl]
              .map(v => v.toString(16).padStart(2,"0"))
              .join("");
        };

        resolve({
          accent: pastel(a),
          secondary: pastel(b)
        });
      };

      img.onerror = () =>
        reject(new Error("อ่านรูปพื้นหลังไม่สำเร็จ"));

      img.src = reader.result;
    };

    reader.onerror = () =>
      reject(new Error("อ่านไฟล์รูปไม่สำเร็จ"));

    reader.readAsDataURL(file);
  });
}

$("#backgroundImage")?.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  const previewUrl = URL.createObjectURL(file);
  renderBackgroundPreview(previewUrl);
  document.body.classList.add("has-custom-background");
  document.body.style.backgroundImage = `url("${previewUrl}")`;

  if ($("#autoTheme").checked) {
    try {
      const colors = await extractThemeColors(file);

      $("#accentColor").value = colors.accent;
      $("#secondaryColor").value = colors.secondary;

      document.documentElement.style.setProperty(
        "--accent-color",
        colors.accent
      );
      document.documentElement.style.setProperty(
        "--secondary-color",
        colors.secondary
      );
    } catch (err) {
      console.error(err);
    }
  }
});

$("#siteSettingsForm")?.addEventListener("submit", async e => {
  e.preventDefault();

  try {
    const file = $("#backgroundImage").files[0];

    let backgroundUrl =
      state.siteSettings?.background_image || null;

    let accent =
      $("#accentColor").value || "#9ed8f5";

    let secondary =
      $("#secondaryColor").value || "#f6b6d1";

    if (file) {
      if ($("#autoTheme").checked) {
        const colors = await extractThemeColors(file);
        accent = colors.accent;
        secondary = colors.secondary;

        $("#accentColor").value = accent;
        $("#secondaryColor").value = secondary;
      }

      backgroundUrl =
        await uploadImage(file, "background");
    }

    const { error } =
      await sb.from("site_settings").upsert({
        id: 1,
        background_image: backgroundUrl,
        accent_color: accent,
        secondary_color: secondary,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await loadSiteSettings();
    toast("บันทึกพื้นหลังและธีมแล้ว");

  } catch (err) {
    console.error(err);
    toast(err.message || "บันทึกธีมไม่สำเร็จ");
  }
});

$("#removeBackgroundBtn")?.addEventListener("click", async () => {
  if (!confirm(
    "ลบรูปพื้นหลังและกลับธีมเริ่มต้น?"
  )) return;

  try {
    const { error } =
      await sb.from("site_settings").upsert({
        id: 1,
        background_image: null,
        accent_color: "#9ed8f5",
        secondary_color: "#f6b6d1",
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    $("#backgroundImage").value = "";
    $("#accentColor").value = "#9ed8f5";
    $("#secondaryColor").value = "#f6b6d1";

    applySiteTheme({
      background_image: null,
      accent_color: "#9ed8f5",
      secondary_color: "#f6b6d1"
    });

    toast("กลับธีมเริ่มต้นแล้ว");

  } catch (err) {
    console.error(err);
    toast(err.message || "ลบพื้นหลังไม่สำเร็จ");
  }
});

async function initApp() {
  await loadSiteSettings();
  await loadAll();
  await loadSocialLinks();
}

initApp();
