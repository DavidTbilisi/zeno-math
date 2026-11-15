"""Plot the reported preliminary thesis table values without rerunning experiments."""
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

OUT=Path(__file__).resolve().parents[1]/'docs/thesis/figures'
plt.rcParams.update({'font.family':'DejaVu Serif','font.size':11,'axes.spines.top':False,'axes.spines.right':False})
fig,ax=plt.subplots(figsize=(7,3.7),layout='constrained')
x=[1,2,4,8,16]
ax.plot(x,[98,58.8,23.3,7.7,.5],'o-',label='Coarse BKT at 0.95',color='#25476a')
ax.plot(x,[97.1,47.9,18.8,6.7,.5],'s--',label='EMA at matched cost',color='#9b5426')
ax.plot(x[:3],[98,98,98.5],'^-',label='Per-component BKT at 0.95',color='#426a46')
ax.set(xscale='log',xticks=x,xticklabels=x,ylim=(0,105),xlabel='Real components per skill',ylabel='Declaration precision (%)')
ax.grid(axis='y',alpha=.2);ax.legend(loc='lower left',fontsize=9)
fig.savefig(OUT/'preliminary-grain-precision.png',dpi=220);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(7,3.5),layout='constrained')
x=[1,2,4];means=[11.05,14.46,21.02]
axes[0].errorbar(x,means,yerr=[[.60,.52,.68],[.59,.49,.68]],fmt='o-',capsize=4,color='#25476a')
axes[0].set(ylabel='Mean answers within practice',ylim=(0,30),title='Training-selected rule')
axes[1].plot(x,[94.5,74.9,7.1],'s-',color='#9b5426')
axes[1].set(ylabel='Practices declared mastered (%)',ylim=(0,100),title='Deployment threshold 0.95')
for ax in axes:ax.set(xticks=x,xlabel='Parts per true component');ax.grid(axis='y',alpha=.2)
fig.savefig(OUT/'preliminary-splitting-cost.png',dpi=220);plt.close(fig)
