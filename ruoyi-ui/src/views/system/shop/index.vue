<template>
    <div class="app-container">
            我是商品
    </div>
  </template>
  
  <script>

  
  export default {
    name: "shop",
    dicts: [],
    components: {  },
    data() {
      return {
      

      };
    },
    created() {
    
    },
    methods: {

      getList() {
        this.loading = true;
        listDept(this.queryParams).then(response => {
          this.deptList = this.handleTree(response.data, "deptId");
          this.loading = false;
        });
      },
      /** 转换部门数据结构 */
      normalizer(node) {
        if (node.children && !node.children.length) {
          delete node.children;
        }
        return {
          id: node.deptId,
          label: node.deptName,
          children: node.children
        };
      },
      // 取消按钮
      cancel() {
        this.open = false;
        this.reset();
      },
      // 表单重置
      reset() {
        this.form = {
          deptId: undefined,
          parentId: undefined,
          deptName: undefined,
          orderNum: undefined,
          leader: undefined,
          phone: undefined,
          email: undefined,
          status: "0"
        };
        this.resetForm("form");
      },
      /** 搜索按钮操作 */
      handleQuery() {
        this.getList();
      },
      /** 重置按钮操作 */
      resetQuery() {
        this.resetForm("queryForm");
        this.handleQuery();
      },
      /** 新增按钮操作 */
      handleAdd(row) {
        this.reset();
        if (row != undefined) {
          this.form.parentId = row.deptId;
        }
        this.open = true;
        this.title = "添加部门";
        listDept().then(response => {
          this.deptOptions = this.handleTree(response.data, "deptId");
        });
      },
      /** 展开/折叠操作 */
      toggleExpandAll() {
        this.refreshTable = false;
        this.isExpandAll = !this.isExpandAll;
        this.$nextTick(() => {
          this.refreshTable = true;
        });
      },
      /** 修改按钮操作 */
      handleUpdate(row) {
        this.reset();
        getDept(row.deptId).then(response => {
          this.form = response.data;
          this.open = true;
          this.title = "修改部门";
        });
        listDeptExcludeChild(row.deptId).then(response => {
          this.deptOptions = this.handleTree(response.data, "deptId");
        });
      },
      /** 提交按钮 */
      submitForm: function() {
        this.$refs["form"].validate(valid => {
          if (valid) {
            if (this.form.deptId != undefined) {
              updateDept(this.form).then(response => {
                this.$modal.msgSuccess("修改成功");
                this.open = false;
                this.getList();
              });
            } else {
              addDept(this.form).then(response => {
                this.$modal.msgSuccess("新增成功");
                this.open = false;
                this.getList();
              });
            }
          }
        });
      },
      /** 删除按钮操作 */
      handleDelete(row) {
        this.$modal.confirm('是否确认删除名称为"' + row.deptName + '"的数据项？').then(function() {
          return delDept(row.deptId);
        }).then(() => {
          this.getList();
          this.$modal.msgSuccess("删除成功");
        }).catch(() => {});
      }
    }
  };
  </script>
  