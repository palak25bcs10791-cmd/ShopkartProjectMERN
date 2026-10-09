const base = process.env.API_BASE_URL || 'http://localhost:3000';
const cookieMap = new Map();

function applyCookies(res) {
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const row of setCookies) {
    const item = row.split(';')[0];
    const idx = item.indexOf('=');
    if (idx > -1) {
      const name = item.slice(0, idx);
      const value = item.slice(idx + 1);
      if (name === 'token') cookieMap.set(name, value);
    }
  }
}

async function request(method, path, data) {
  const headers = {};
  if (cookieMap.size) {
    headers.Cookie = Array.from(cookieMap.entries()).map(([name, value]) => name + '=' + value).join('; ');
  }

  const requestBody = data === undefined ? undefined : JSON.stringify(data);
  if (requestBody) headers['Content-Type'] = 'application/json';

  const res = await fetch(base + path, {
    method,
    headers,
    body: requestBody,
    credentials: 'include',
  });

  applyCookies(res);
  const text = await res.text();
  return {
    status: res.status,
    contentType: res.headers.get('content-type'),
    body: text ? JSON.parse(text) : null,
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const email = `lab4wishlist_${Date.now()}@example.com`;

  const register = await request('POST', '/customers/register', {
    fullName: 'Lab Tester',
    email,
    password: 'Pass1234',
    phone: '9876543210',
  });
  expect(register.status === 201, `Register failed: ${JSON.stringify(register.body)}`);
  console.log('REGISTER', register.status, register.body.message);

  const login = await request('POST', '/customers/login', {
    email,
    password: 'Pass1234',
  });
  expect(login.status === 200, `Login failed: ${JSON.stringify(login.body)}`);
  expect(cookieMap.has('token'), 'Login did not set the token cookie');
  console.log('LOGIN', login.status, login.body.message);

  const products = await request('GET', '/products');
  expect(products.status === 200 && products.body.products?.length, 'No product available to test wishlist');
  const productId = products.body.products[0]._id;
  console.log('PRODUCT', productId);

  const initial = await request('GET', '/customers/wishlist');
  expect(initial.status === 200, `Wishlist fetch failed: ${JSON.stringify(initial.body)}`);
  expect(Array.isArray(initial.body.wishlist), 'Wishlist response did not contain a wishlist array');
  console.log('GET_WISHLIST', initial.status, initial.body.wishlist.length);

  const add = await request('POST', '/customers/wishlist', { productId });
  expect(add.status >= 200 && add.status < 300, `Wishlist add failed: ${JSON.stringify(add.body)}`);
  const logout = await request('POST', '/customers/logout');
  expect(logout.status === 200, `Logout failed: ${JSON.stringify(logout.body)}`);
  cookieMap.clear();

  const relogin = await request('POST', '/customers/login', { email, password: 'Pass1234' });
  expect(relogin.status === 200, `Relogin failed: ${JSON.stringify(relogin.body)}`);
  expect(cookieMap.has('token'), 'Relogin did not set the token cookie');

  const afterRelogin = await request('GET', '/customers/wishlist');
  expect(afterRelogin.status === 200, `Wishlist fetch after relogin failed: ${JSON.stringify(afterRelogin.body)}`);
  expect(afterRelogin.body.wishlist.some((product) => product._id === productId), 'Added product did not persist after relogin');
  console.log('ADD_AND_RELOGIN_PERSIST', add.status, 'product is present');

  const remove = await request('DELETE', '/customers/wishlist/' + productId);
  expect(remove.status >= 200 && remove.status < 300, `Wishlist remove failed: ${JSON.stringify(remove.body)}`);
  const afterRemove = await request('GET', '/customers/wishlist');
  expect(afterRemove.status === 200, `Wishlist fetch after remove failed: ${JSON.stringify(afterRemove.body)}`);
  expect(!afterRemove.body.wishlist.some((product) => product._id === productId), 'Removed product is still present');
  console.log('REMOVE_AND_PERSIST', remove.status, 'product is absent');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
