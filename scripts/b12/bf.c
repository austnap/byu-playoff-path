#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "data.h"
#define SC 720720LL
typedef struct { int w[NT]; signed char b[NT][NT]; } St;
static int EST;
static long long pctVs(const St*S,int t,const int*set,int n){int w=0,g=0;for(int i=0;i<n;i++){int o=set[i]; if(S->b[t][o]){w++;g++;} else if(S->b[o][t]) g++;} return g? w*SC/g : 0;}
static int seedTop(const St*S,const int*g,int n);
// narrow: given vals, if not all equal recurse on leaders; returns -1 if all equal
static int narrow(const St*S,const int*g,int n,const long long*v){
  long long best=v[0]; int eq=1; for(int i=1;i<n;i++){ if(v[i]!=v[0]) eq=0; if(v[i]>best) best=v[i]; }
  if(eq) return -1; int L[NT],m=0; for(int i=0;i<n;i++) if(v[i]==best) L[m++]=g[i];
  return seedTop(S,L,m);
}
static int seedTop(const St*S,const int*g,int n){
  if(n==1) return g[0];
  long long v[NT]; int r;
  if(n==2){ int x=g[0],y=g[1]; if(OPPM[x][y]){ v[0]=S->b[x][y]; v[1]=S->b[y][x]; if((r=narrow(S,g,n,v))>=0) return r; } }
  else {
    int all=1; for(int i=0;i<n&&all;i++) for(int j=0;j<n;j++) if(i!=j&&!OPPM[g[i]][g[j]]){all=0;break;}
    if(all){ for(int i=0;i<n;i++){ int ot[NT],k=0; for(int j=0;j<n;j++) if(j!=i) ot[k++]=g[j]; v[i]=pctVs(S,g[i],ot,k);} if((r=narrow(S,g,n,v))>=0) return r; }
    else { for(int i=0;i<n;i++){ int ok=1; for(int j=0;j<n;j++) if(j!=i && !S->b[g[i]][g[j]]){ok=0;break;} if(ok) return g[i]; } }
  }
  int inG[NT]={0}; for(int i=0;i<n;i++) inG[g[i]]=1;
  int com[NT],nc=0; for(int o=0;o<NT;o++){ if(inG[o]) continue; int ok=1; for(int i=0;i<n;i++) if(!OPPM[g[i]][o]){ok=0;break;} if(ok) com[nc++]=o; }
  for(int i=0;i<n;i++) v[i]=pctVs(S,g[i],com,nc);
  if((r=narrow(S,g,n,v))>=0) return r;
  int myW=S->w[g[0]];
  for(int lvl=9;lvl>=0;lvl--){ if(lvl==myW) continue; int grp[NT],k=0; for(int i=0;i<nc;i++) if(S->w[com[i]]==lvl) grp[k++]=com[i]; if(!k) continue;
    for(int i=0;i<n;i++) v[i]=pctVs(S,g[i],grp,k); if((r=narrow(S,g,n,v))>=0) return r; }
  for(int i=0;i<n;i++){ long long s=0; for(int o=0;o<NT;o++) if(OPPM[g[i]][o]) s+=S->w[o]; v[i]=s; }
  if((r=narrow(S,g,n,v))>=0) return r;
  EST=1; int bt=g[0]; for(int i=1;i<n;i++) if(RANKPOS[g[i]]<RANKPOS[bt]) bt=g[i]; return bt;
}
static void top2(const St*S,int*out){
  int got=0;
  for(int lvl=9;lvl>=0&&got<2;lvl--){
    int g[NT],n=0; for(int t=0;t<NT;t++) if(S->w[t]==lvl) g[n++]=t;
    while(n>0&&got<2){ int t= n==1?g[0]:seedTop(S,g,n); out[got++]=t; int k=0; for(int i=0;i<n;i++) if(g[i]!=t) g[k++]=g[i]; n=k; }
  }
}
static void build(St*S,uint32_t m){
  memcpy(S->w,BASEW,sizeof BASEW); memcpy(S->b,BASEB,sizeof BASEB);
  for(int i=0;i<NG;i++){ int w,l; if(m>>i&1){w=GH[i];l=GA[i];}else{w=GA[i];l=GH[i];} S->w[w]++; S->b[w][l]=1; }
}
// team's own-game pattern
static int TG[NT][4], TS[NT][4], TN[NT];
int main(int argc,char**argv){
  for(int i=0;i<NG;i++){ int h=GH[i],a=GA[i]; TG[h][TN[h]]=i; TS[h][TN[h]++]=1; TG[a][TN[a]]=i; TS[a][TN[a]++]=0; }
  if(argc>1 && !strcmp(argv[1],"test")){ unsigned m; while(scanf("%u",&m)==1){ St S; build(&S,m); int o[2]; EST=0; top2(&S,o); printf("%d %d\n",o[0],o[1]); } return 0; }
  static double PO[65536],PI[65536]; const int NO=NG-16;
  for(uint32_t x=0;x<65536;x++){ double a=1,b=1; for(int i=0;i<16;i++){ a*= (x>>i&1)?PH[i]:1-PH[i]; if(i<NO) b*= (x>>i&1)?PH[16+i]:1-PH[16+i]; } PI[x]=a; PO[x]=b; }
  double title[NT]={0},seed1[NT]={0},pair[NT][NT]={{0}},pat[NT][16]={{0}},condH[NT][NG]={{0}},est=0; unsigned long long cnt[NT]={0};
  static double CW[NT][5][243],CI[NT][5][243]; static unsigned long long CO[NT][5][243];
  #pragma omp parallel
  {
    double t_title[NT]={0},t_seed1[NT]={0},t_pair[NT][NT]={{0}},t_pat[NT][16]={{0}},t_cond[NT][NG]={{0}},t_est=0; unsigned long long t_cnt[NT]={0};
    double (*tCW)[5][243]=calloc(NT,sizeof *tCW),(*tCI)[5][243]=calloc(NT,sizeof *tCI); unsigned long long (*tCO)[5][243]=calloc(NT,sizeof *tCO);
    #pragma omp for schedule(dynamic,16)
    for(uint32_t hi=0;hi<(1u<<NO);hi++){
      for(uint32_t lo=0;lo<65536;lo++){
        uint32_t m=(hi<<16)|lo; double p=PO[hi]*PI[lo];
        St S; build(&S,m); int o[2]; EST=0; top2(&S,o);
        if(EST) t_est+=p;
        { int rl[NT]; for(int t=0;t<NT;t++) rl[t]=GR[t]-(S.w[t]-BASEW[t]);
          for(int t=0;t<NT;t++){ if(!TRK[t]) continue; int own=S.w[t]-BASEW[t]; int cell=0;
            for(int k=0;k<5;k++){ int L=rl[RIV[t][k]]; cell=cell*3+(L>2?2:L); }
            tCW[t][own][cell]+=p; if(o[0]==t||o[1]==t) tCI[t][own][cell]+=p; else tCO[t][own][cell]++; } }
        t_seed1[o[0]]+=p; int a=o[0]<o[1]?o[0]:o[1], b=o[0]<o[1]?o[1]:o[0]; t_pair[a][b]+=p;
        for(int k=0;k<2;k++){ int t=o[k]; t_title[t]+=p; t_cnt[t]++;
          int pt=0; for(int j=0;j<TN[t];j++){ int won = ((m>>TG[t][j])&1)==TS[t][j]; pt|=won<<j; } t_pat[t][pt]+=p;
          uint32_t mm=m; for(int gi=0;gi<NG;gi++){ if(mm&1) t_cond[t][gi]+=p; mm>>=1; } }
      }
    }
    #pragma omp critical
    { for(int t=0;t<NT;t++){ title[t]+=t_title[t]; seed1[t]+=t_seed1[t]; cnt[t]+=t_cnt[t]; for(int u=0;u<NT;u++) pair[t][u]+=t_pair[t][u]; for(int q=0;q<16;q++) pat[t][q]+=t_pat[t][q]; for(int gi=0;gi<NG;gi++) condH[t][gi]+=t_cond[t][gi]; } est+=t_est;
      for(int t=0;t<NT;t++) for(int a=0;a<5;a++) for(int b=0;b<243;b++){ CW[t][a][b]+=tCW[t][a][b]; CI[t][a][b]+=tCI[t][a][b]; CO[t][a][b]+=tCO[t][a][b]; } }
    free(tCW); free(tCI); free(tCO);
  }
  printf("{\"est\":%.10g,\"title\":[",est); for(int t=0;t<NT;t++) printf("%s%.10g",t?",":"",title[t]);
  printf("],\"seed1\":["); for(int t=0;t<NT;t++) printf("%s%.10g",t?",":"",seed1[t]);
  printf("],\"cnt\":["); for(int t=0;t<NT;t++) printf("%s%llu",t?",":"",cnt[t]);
  printf("],\"pair\":["); for(int t=0;t<NT;t++){ printf("%s[",t?",":""); for(int u=0;u<NT;u++) printf("%s%.10g",u?",":"",pair[t][u]); printf("]"); }
  printf("],\"pat\":["); for(int t=0;t<NT;t++){ printf("%s[",t?",":""); for(int q=0;q<16;q++) printf("%s%.10g",q?",":"",pat[t][q]); printf("]"); }
  printf("],\"condH\":["); for(int t=0;t<NT;t++){ printf("%s[",t?",":""); for(int g=0;g<NG;g++) printf("%s%.10g",g?",":"",condH[t][g]); printf("]"); }
  printf("],\"cells\":[");
  for(int t=0;t<NT;t++){ printf("%s[",t?",":""); int first=1;
    for(int a=0;a<5;a++) for(int b=0;b<243;b++) if(CW[t][a][b]>0){ printf("%s[%d,%d,%.6g,%.6g,%llu]",first?"":",",a,b,CW[t][a][b],CI[t][a][b],CO[t][a][b]); first=0; }
    printf("]"); }
  printf("]}\n"); return 0;
}
