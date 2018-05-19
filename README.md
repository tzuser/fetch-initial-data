# react服务端渲染首次获取数据

## 安装
``` 
npm install --save fetch-initial-data

```
## 使用演示
[https://github.com/tzuser/ssr_base](https://github.com/tzuser/ssr_base)


### 需要首次加载的组件
```
import {bindActionCreators} from 'redux';
class Home extends Component{
  constructor(props){
    super(props)
    //判断是否是浏览器
    if(typeof window==="object")this.fetchData();
  }
  //fetchData固定名称，必须返回异步,且所有action需要awiat
  async fetchData(){
    await this.props.getDataAct();
  }
  render(){
    let {data}=this.props;
    return <div>首页 {data} </div>
  }
}
const mapStateToProps=(state)=>({
  data:state.config.data
})
const mapDispatchToProps=(dispatch)=>bindActionCreators({
  getDataAct:Acts.getData,
},dispatch)

export default connect(mapStateToProps,mapDispatchToProps)(Home)
```


### 服务端
```
import {getDataFromTree} from 'fetch-initial-data';

const render=async (ctx,next)=>{
  //获取store
  const { store, history } = createServerStore(ctx.req.url);
  const AppRender=(
      <Provider store={store}>
        <ConnectedRouter history={history}>
          <App/>
        </ConnectedRouter>
      </Provider>
  )
  //保证所有请求完成
  await getDataFromTree(AppRender);
  //取得state传入html
  let state=store.getState();
  //开始渲染
  let routeMarkup =renderToString(AppRender)
}
```

### 代码借鉴apollo-client
[apollo-client](https://github.com/apollographql/apollo-client)