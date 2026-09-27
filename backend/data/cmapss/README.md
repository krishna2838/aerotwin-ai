# NASA C-MAPSS FD001

Drop the real dataset files here to use them instead of the built-in
synthetic corpus:

```
train_FD001.txt
test_FD001.txt
RUL_FD001.txt
```

Source: NASA Prognostics Data Repository
https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/

If these files are absent, `app/data.py` transparently generates a
C-MAPSS-shape synthetic corpus (200 units, run-to-failure, same 21-sensor
+ 3-setting schema, same degradation curve family) so training and
inference always work.
